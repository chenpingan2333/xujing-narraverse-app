import { connect, TLSSocket } from "node:tls";

/**
 * Send an email via SMTP over SSL (port 465) using pure Node.js tls.
 * QQ SMTP requires SSL and auth code (not password).
 */
export async function sendEmail(opts: {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  const { host, port, user, pass, from, to, subject, text } = opts;

  return new Promise((resolve, reject) => {
    const socket = connect({ host, port, rejectUnauthorized: true }, () => {
      let buf = "";
      let step = 0;

      const send = (cmd: string) => {
        socket.write(cmd + "\r\n");
      };

      const onData = (data: Buffer) => {
        buf += data.toString();

        while (buf.includes("\r\n")) {
          const idx = buf.indexOf("\r\n");
          const line = buf.slice(0, idx);
          buf = buf.slice(idx + 2);

          const code = parseInt(line.slice(0, 3), 10);
          if (isNaN(code)) continue;

          // Multi-line responses start with code + "-"
          if (line[3] === "-") continue;

          if (code >= 400) {
            socket.destroy();
            return reject(new Error(`SMTP error ${code}: ${line}`));
          }

          step++;
          switch (step) {
            case 1: // Server greeting → EHLO
              send(`EHLO narraverse`);
              break;
            case 2: // EHLO response → AUTH LOGIN
              send("AUTH LOGIN");
              break;
            case 3: // AUTH LOGIN response → send username (base64)
              send(Buffer.from(user).toString("base64"));
              break;
            case 4: // username accepted → send password (base64)
              send(Buffer.from(pass).toString("base64"));
              break;
            case 5: // auth success → MAIL FROM
              send(`MAIL FROM:<${from}>`);
              break;
            case 6: // MAIL FROM ok → RCPT TO
              send(`RCPT TO:<${to}>`);
              break;
            case 7: // RCPT TO ok → DATA
              send("DATA");
              break;
            case 8: // DATA go-ahead (354) → send headers + body
              send(`From: 叙境 <${from}>`);
              send(`To: <${to}>`);
              send(`Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`);
              send("Content-Type: text/plain; charset=UTF-8");
              send("");
              send(text);
              send(".");
              break;
            case 9: // message accepted → QUIT
              send("QUIT");
              break;
            case 10: // QUIT response → done
              socket.destroy();
              resolve();
              break;
          }
        }
      };

      socket.on("data", onData);
      socket.on("error", reject);
      socket.on("close", () => {
        if (step < 10) reject(new Error("SMTP connection closed unexpectedly"));
      });
    });

    socket.on("error", reject);
  });
}
