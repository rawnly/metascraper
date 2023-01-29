import { VercelRequest, VercelResponse } from "@vercel/node";
import { JSDOM } from "jsdom";
import { z } from "zod";

const RequestBody = z.object({
  url: z.string().url("invalid url"),
});

const Handler = async (req: VercelRequest, res: VercelResponse) => {
  if (req.method?.toLowerCase() !== "post") {
    return res.status(405);
  }

  const body = await RequestBody.safeParseAsync(req.body);

  if (!body.success) {
    return res.status(400).send({
      title: "Bad Request",
      message: body.error.message,
      errors: body.error.errors,
    });
  }

  const response = await fetch(body.data.url);

  if (!response.ok) {
    return res.status(response.status).send(response.body);
  }

  const content = await response.text();
  const { window } = new JSDOM(content);

  const { head } = window.document;

  const title = Array.from(head.getElementsByTagName("title"))
    .map((item) => item.textContent)
    .pop();

  const metas = Array.from(head.getElementsByTagName("meta")).reduce(
    (acc, item) => {
      const key = item.getAttribute("name") ?? item.getAttribute("property");

      if (!key) return acc;

      if (key === "keywords") {
        const value =
          item.getAttribute("content") || item.getAttribute("value");

        return {
          ...acc,
          [key]: value?.split(","),
        };
      }

      return {
        ...acc,
        [key]: item.getAttribute("content") || item.getAttribute("value"),
      };
    },
    {} as Record<string, any>
  );

  return res.send({ title, metas });
};

export default Handler;
