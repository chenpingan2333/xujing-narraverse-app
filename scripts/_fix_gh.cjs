const fs = require("fs");
let c = fs.readFileSync("app/api/auth/github/callback/route.ts", "utf8");

const oldBlock = `    const token = await createSession(userId);
    await setSessionCookie(token);

    return NextResponse.redirect(new URL("/chat", req.url));`;

const newBlock = `    const token = await createSession(userId);
    const redirectRes = NextResponse.redirect(new URL("/chat", req.url));
    redirectRes.cookies.set("narraverse_session", token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return redirectRes;`;

const idx = c.indexOf(oldBlock);
if (idx === -1) { console.log("NOT FOUND"); process.exit(1); }
c = c.slice(0, idx) + newBlock + c.slice(idx + oldBlock.length);
fs.writeFileSync("app/api/auth/github/callback/route.ts", c, "utf8");
console.log("done");
