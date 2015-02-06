var app = require('http').createServer(handler)
  , io  = require('socket.io').listen(app)
  , fs  = require('fs')
  , mime= require('mime')
app.listen(3000);
 
function handler (req, res) {
  // Check File Path
  var path;
  if(req.url == '/') {
    path = './index.html';
  }
  else {
    path = '.' + req.url;
  }
 
  // Read File and Write
  fs.readFile(path, function (err, data) {
    if(err) {
      res.writeHead(404, {"Content-Type": "text/plain"});
      return res.end(req.url + ' not found.');
    }
    var type = mime.lookup(path);
    res.writeHead(200, {"Content-Type": type});
    res.write(data);
    res.end();
  });
}
 
var count = 0;
var table_UserRoom = new Object();
var table_User = new Object();
var roomList = new Object();
var jsonBoth = {};
var myD = new Date() ;
var myYear  = myD.getFullYear();  // 年
var myMonth = myD.getMonth()+1; // 月
var myDate  = myD.getDate();  // 日
 
 
chat = io.sockets.on("connection", function (socket) {
 
  // オンライン人数を追加
  if(!table_UserRoom[socket.id])
    count++;
  io.sockets.emit("port", {value: count});
 
  //ルームが作られていればクライアントに送信
  function upDateRL(roomList) {
    if(roomList)
      io.sockets.emit("roomList", roomList);
  }
  upDateRL(roomList);
 
  // クライアントの入場
  socket.on("enter", function(enterData) {
    var enterRoomName = htmlspecialchars(enterData.room);
    var enterUserName = htmlspecialchars(enterData.name);
    if(!roomList[enterRoomName]) {
      // ルームがない場合
      roomList[enterRoomName] = 1;
 
      table_UserRoom[socket.id] = enterRoomName;
      table_User[socket.id] = enterUserName;
      socket.join(enterRoomName);
 
      io.sockets.to(enterRoomName).emit('message',enterUserName+"様が"+enterRoomName+"に入室しました.");
      io.sockets.emit("roomList", roomList);
    } else if(roomList[enterRoomName]) {
      // ルームがある場合
      if(roomList[enterRoomName]>=1 && roomList[enterRoomName]<20) {
        // 部屋の人数に空きがあるかを確認
        roomList[enterRoomName]++;
 
        table_UserRoom[socket.id] = enterRoomName;
        table_User[socket.id] = enterUserName;
        socket.join(enterRoomName);
 
        io.sockets.to(enterRoomName).emit('message',enterUserName+"様が"+enterRoomName+"に入室しました.");
        io.sockets.emit("roomList", roomList);
      } else {
        // 満室
        socket.emit('message',enterRoomName+"は満室です.");
      }
    }
  });
  // クライアントの退場
  socket.on("exit", function(exitData) {
    var exitRoomName = htmlspecialchars(exitData.room);
    var exitUserName = htmlspecialchars(exitData.name);
 
    if(--roomList[exitRoomName] <= 0);
    //  roomList.splice(exitRoomName,1);
    table_UserRoom[socket.id] = null;
    table_User[socket.id] = null;
 
    socket.leave(exitRoomName);
    io.sockets.emit("roomList", roomList);
    io.sockets.to(exitRoomName).emit('message',  exitUserName+"様が"+exitRoomName+"を退室しました.");
  });
 
  // メッセージ送信 (送信者にも送られる)
  socket.on('message', function(message) {
    var user = table_User[socket.id];
    var room = table_UserRoom[socket.id];
    messageData = htmlspecialchars(message.mess);
    io.sockets.to(room).emit('message', messageData);
    // ログに書き込み
    var now = "" + myYear + myMonth + myDate;
    var messdata = messageData + '\n';
    var outputPath = './public/log/'+ room + now +'.txt';
    if (fs.existsSync(outputPath)) {
      fs.appendFile(
         outputPath
        ,messdata,
        function (err) {
            console.log(err);
        }
      );
    } else {
      fs.writeFile(
        outputPath
        ,messdata,
        function (err) {
          console.log(err);
        }
      );
    }
  });
 
  // 切断したときに送信
  socket.on("disconnect", function (err, _room) {
    count--;
    var room = table_UserRoom[socket.id];
    var user = table_User[socket.id];
    if(room) {
      roomList[room]--;
      socket.leave(room);
 
      if(roomList[room] < 1) {
        delete roomList[room];
        io.sockets.emit("roomDel", roomList);
      } else {
        io.sockets.to(room).emit("message", user+"様が"+room+"を退室しました.");
        upDateRL(roomList);
      }
    }
    io.sockets.emit("port",{value: count});
  });
 
  // File（画像.etc）送信
  socket.on('msg upload', function (data) {
    var name = data.name || anonymous;
    var usr = table_User[socket.id];
    var room = table_UserRoom[socket.id];
    var img = data.data;
    io.sockets.to(room).emit('notify', {usr : usr, name : name, url : img});
  });
 
  // ログ送信
  socket.on('read', function (data) {
    var user = table_User[socket.id];
    var room = table_UserRoom[socket.id];
    var now = "" + myYear + myMonth + myDate;
    var name = room + now + '.txt';
    var outputPath = './public/log/'+ name;
    if (fs.existsSync(outputPath)) {
      fs.readFile(outputPath, 'base64', function (err, data) {
       if (err) throw err;
       var txt = data;
      socket.emit('readFile', {usr : user, name : name, txt : txt});
      });
    } else {
      var err = 'nofile';
      socket.emit('readFile', {name:err});
    }
  });
 
});
 
function htmlspecialchars(ch) {
    // ch = ch.replace(/&/g,"＆");
    // ch = ch.replace(/"/g,"”");
    // ch = ch.replace(/'/g,"’");
    // ch = ch.replace(/>/g, "＞");
    return ch;
}