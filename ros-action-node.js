module.exports = function(RED) {
  return function(config) {
    var ROSLIB = require('roslib');
    const Time = require('./Time.js');

    RED.nodes.createNode(this, config);
    var node = this;

    node.server = RED.nodes.getNode(config.server);

    if (!node.server || !node.server.ros){
      return;
    }

    node.on('input', (msg) => {
      var life_check = true;

      var client = new ROSLIB.ActionClient({
        ros: node.server.ros,
        serverName: config.servername,
        actionName : config.actionname,
        timeout: 1000
      });
  
      var goalMessage = {};

      if(config.msgpayload){
        Object.assign(goalMessage, msg.payload);
      } else {
        try {
          const obj = JSON.parse(config.messagedata);
          Object.assign(goalMessage, obj);
        } catch(e) {
          node.error('cannot parse json data from message data');
          node.status({fill:"yellow",shape:"dot",text:"warn"})
        }
      }

      var goal = new ROSLIB.Goal({
        actionClient: client,
        goalMessage: goalMessage
      });

      // TODO: 処理後にリザルトが来ることがある
      goal.on('result', (result) => {
        node.status({fill:"green",shape:"dot",text:"finished"});
        node.send({payload: result});
      });

      goal.on('status', (status) => {
        life_check = true;
      });

      node.status({fill:"blue",shape:"dot",text:"running"});
      goal.send();

      // TODO: タイムアウトがリザルト後に処理されてしまう
      setInterval(() => {
        if(!life_check){
          client.cancel();
          node.status({fill:"red",shape:"dot",text:"unconnected"});
          node.send({payload: {success: false, message: "server not respoce"}});
        }
        else{
          life_check = false;
        }
      }, 3000);
    });

    node.server.on('ros connected', () => {
      node.status({fill:"green",shape:"dot",text:"connected"});
    });

    node.server.on('ros error', () => {
      node.status({fill:"red",shape:"dot",text:"error"});
    });

  }
}