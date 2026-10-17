import { getChatGPTUser } from "../../../chatgpt-auth";
import { rejectCrossOriginWrite } from "../../../../lib/request-security";
import { activationCode, claimOwnership, getOwnerUserId } from "../../../../db/content-store";

export async function POST(request: Request) {
  const rejection = rejectCrossOriginWrite(request);
  if (rejection) return rejection;
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required." }, { status: 401 });

  const ownerId = await getOwnerUserId();
  if (ownerId && ownerId !== user.userId) {
    return Response.json({ error: "This dashboard already has an owner." }, { status: 403 });
  }
  if (ownerId === user.userId) return Response.json({ activated: true });

  const payload = (await request.json()) as { code?: string };
  const expectedCode = activationCode();
  if (!expectedCode || payload.code?.trim() !== expectedCode) {
    return Response.json({ error: "The activation code is not correct." }, { status: 403 });
  }

  const claimedOwner = await claimOwnership(user.userId);
  if (claimedOwner !== user.userId) {
    return Response.json({ error: "The dashboard was claimed by another account." }, { status: 409 });
  }
  return Response.json({ activated: true });
}
