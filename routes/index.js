var express = require("express");
var router = express.Router();
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");
const title = ['成交價','昨收','漲跌價','漲跌幅','振幅','開盤','最高','最低','成交張數','成交金額','成交筆數','成交均張','成交均價','PBR','PER','PEG','昨日張數','昨日金額','昨日筆數','昨日均張','昨日均價','昨漲跌價 (幅)','連漲連跌','財報評分','上市指數'];  

/* GET home page. */
router.get("/", async function (req, res, next) {
  console.log(req.query)
  const { stockName, filteredNumbers } = await scrapeData('1455');

  const result = title.reduce((obj, key, index) => {
    obj[key] = filteredNumbers[index]; // 将当前的 key (来自数组 b) 映射到数组 a 的相应值
    return obj;
  }, {});

  const ws_s = XLSX.utils.json_to_sheet([], {
    header: title,
  });
  XLSX.utils.sheet_add_json(ws_s, [result], {
    origin: "A2",
    skipHeader: true,
  });

  const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws_s, "資料");

      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

      const fileName = `${stockName}.xlsx`;
      let userAgent = (req.headers["user-agent"] || "").toLowerCase();

      if (userAgent.indexOf("msie") >= 0 || userAgent.indexOf("chrome") >= 0) {
        res.setHeader(
          "Content-Disposition",
          "attachment; filename=" + encodeURIComponent(fileName)
        );
      } else if (userAgent.indexOf("firefox") >= 0) {
        res.setHeader(
          "Content-Disposition",
          "attachment; filename*=\"utf8''" + encodeURIComponent(fileName) + '"'
        );
      }
      // res.setHeader("Content-Type", "application/vnd.ms-excel");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.send(buffer);
});

async function scrapeData(id) {
  console.log('id',id)
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`https://goodinfo.tw/tw/StockDetail.asp?STOCK_ID=${id}`, {
    waitUntil: "networkidle2",
  });

  const stockName = await page.title(); // 獲取網頁標題

  await page.waitForSelector("tbody");
  //await page.waitForTimeout(2000);  // 增加2秒等待，確保數據加載
  await new Promise((r) => setTimeout(r, 3000));
  const tableData = await page.evaluate(() => {
    const rows = document.querySelectorAll("tbody tr"); // 選取 tbody 中的所有行
    const result = [];

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td"); // 選取每行中的所有單元格
      const rowData = [];

      cells.forEach((cell) => {
        rowData.push(cell.innerText.trim()); // 提取單元格中的文字，去除多餘空白
      });

      result.push(rowData); // 將該行數據加入結果
    });

    return result; // 返回所有提取的數據
  });

  const targetIndex = tableData.findIndex((row) => row[0].startsWith(id));
  const tempFilteredNumbers = tableData[targetIndex];
  const tempContent = tempFilteredNumbers[25];

  const regex = /:\s*([^:]+)/g;
  let matches;
  let finalContentResults = [];

  while ((matches = regex.exec(tempContent)) !== null) {
    // matches[1] 代表第一个括号内匹配的内容，即冒号后面的文本
    finalContentResults.push(matches[1].trim()); // 使用 trim() 去除前后空白
  }

  finalContentResults = finalContentResults.map((item,index) => {
    if(index === 0) {
      return item.replace(/\n財報評分$/, ''); // 使用正则表达式匹配 "上市指數" 及其前面的空白字符，并替换为空字符串
    }
    if (index === 1) { // 只处理数组中的第二个元素
      return item.replace(/\s+上市指數$/, ''); // 使用正则表达式匹配 "上櫃指數" 及其前面的空白字符，并替换为空字符串
    }
    return item;
  });

  const filteredNumbers = tempFilteredNumbers.slice(3, 25).concat(finalContentResults);
  // const filteredNumbers = tableData.flat().filter(item =>
  //   /^-?\d*\.?\d+%?$|^-?\d*\.?\d*萬$|^-?\d*\.?\d*張\/筆$|^-?\d*\.?\d*元$|^N\/A$|^連漲連跌.*$|^財報評分.*$|^平.*$|^\d+\.?\d*\s*\(\s*\d*\.?\d*\s*\/\s*\+?\d*\.?\d*%\s*\)$/.test(item)
  // );
  //const filteredNumbers = tableData
  console.log(filteredNumbers);
  return { stockName, filteredNumbers };
}

module.exports = router;
