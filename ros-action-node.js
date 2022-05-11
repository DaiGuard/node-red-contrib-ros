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
      var running = false;

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
          running = false;

          node.error('cannot parse json data from message data');
          node.status({fill:"yellow",shape:"dot",text:"warn"})
        }
      }

      var goal = new ROSLIB.Goal({
        actionClient: client,
        goalMessage: goalMessage
      });

      goal.on('result', (result) => {
        if(running){ 
          running = false;

          node.status({fill:"green",shape:"dot",text:"finished"});        
          node.send({payload: result});  
        }
      });

      goal.on('status', (status) => {
        life_check = true;
      });

      node.status({fill:"blue",shape:"dot",text:"running"});
      running = true;
      goal.send();

      var intervalID = setInterval(() => {
        if(!life_check){
          if(running){
            running = false;

            client.cancel();
            node.status({fill:"red",shape:"dot",text:"unconnected"});
            node.send({payload: {success: false, message: "server not respoce"}});

            clearInterval(intervalID);
          }
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