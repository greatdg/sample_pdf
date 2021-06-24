const express = require("express");
const fileUpload = require("express-fileupload");
const cors = require("cors");
const bodyParser = require("body-parser");
const _ = require("lodash");
const MD5 = require("crypto-js/md5");

const app = express();
const port = 3000;

app.use(
  fileUpload({
    createParentPath: true,
  })
);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const puppeteer = require("puppeteer");
const Mustache = require("mustache");
const fs = require("fs");

app.post("/uploadTemplate", async (req, res) => {
  try {
    if (!req.files) {
      res.send({
        status: false,
        message: "Error",
      });
    } else {
      let template = req.files.template;
      const hashedTemplateName = MD5(template.name).toString();

      template.mv("./templates/" + hashedTemplateName);

      res.send({
        id: hashedTemplateName,
      });
    }
  } catch (err) {
    res.status(500).send(err);
  }
});

app.post("/pdf", async (req, res) => {
  const { id, payload } = req.body;

  const template = fs.readFileSync(`./templates/${id}`, {
    encoding: "utf8",
  });

  const output = Mustache.render(template, { ...payload });
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setContent(output);

  await page.evaluateHandle("document.fonts.ready");

  await page.pdf({
    path: `${id}.pdf`,
    format: "a4",
    printBackground: true,
    omitBackground: true,
  });

  await browser.close();

  // Upload {id}.pdf to S3
  // Do something here

  res.send({
    url: "S3_URL",
  });
});

app.post("/preview", async (req, res) => {
  const { id, payload } = req.body;

  const template = fs.readFileSync(`./templates/${id}`, {
    encoding: "utf8",
  });

  const output = Mustache.render(template, { ...payload });

  res.send(output);
});

app.listen(port, () => console.log(`App is listening on port ${port}.`));
