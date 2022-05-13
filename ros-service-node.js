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

    var srvType = config.servicetype;

    var client = new ROSLIB.Service({
      name: config.servicename,
      serviceType: srvType
    });

    node.on('input', (msg) => {
      client.ros = node.server.ros;      
      var new_payload = {};
      if(config.msgpayload){        
        Object.assign(new_payload, msg.payload);
      }
      else{
        try {
          const obj = JSON.parse(config.messagedata);
          Object.assign(new_payload, obj);
        } catch(e) {          
          node.error('cannot parse json data from message data');
          node.status({fill:"yellow",shape:"dot",text:"warn"})
        }
      }

      var servicereq = new ROSLIB.ServiceRequest(new_payload);

      node.log('request service client: ' + JSON.stringify(servicereq));

      client.callService(servicereq, (result) => {        
        node.log('responce service client: ' + JSON.stringify(result));
        node.send({payload: result});
      });
    });

    node.server.on('ros connected', () => {
      node.status({fill:"green",shape:"dot",text:"connected"});
    });

    node.server.on('ros error', () => {
      node.status({fill:"red",shape:"dot",text:"error"});
    });

  }
}