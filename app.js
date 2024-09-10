var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 定義路由
app.use('/', indexRouter);
app.use('/users', usersRouter);

// 捕捉 404 並將錯誤轉交給錯誤處理器
app.use(function(req, res, next) {
  next(createError(404));
});

// 錯誤處理器
app.use(function(err, req, res, next) {
  // 設定本地變數，僅在開發環境提供詳細錯誤訊息
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // 回傳錯誤訊息作為 JSON 格式
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

module.exports = app;
