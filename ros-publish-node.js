module.exports = function(RED) {
  return function (config) {
    var ROSLIB = require('roslib'); 
    const Time = require('./Time.js');

    RED.nodes.createNode(this,config);
    var node = this;

    node.server = RED.nodes.getNode(config.server);
    
    if (!node.server || !node.server.ros){
      return;
    }

    // var msgtype = config.typepackage + "/" + config.typename
    var msgtype = config.messagetype;
    var topic = new ROSLIB.Topic({
      name : config.topicname,
      messageType : msgtype
    });

    node.on('input', (msg) => {
      topic.ros = node.server.ros;
      // node.log('publishing msg ' + msg.payload);
      // var pubslishMsg = new ROSLIB.Message({data: msg.payload});
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
      // Insert timestamp in header
      if (config.stampheader){
        const now = Time.now();
        new_payload = addHeader(new_payload, now);
      }

      var topicmsg = new ROSLIB.Message(new_payload);
      topic.publish(topicmsg);
    });

    function addHeader(payload_, now_)
    {      
      if ('header' in payload_){
        payload_.header.stamp = now_;
      }
      else{
        node.error('Cannot add stamp to header, because incoming msg does not contain a header!');
      }
      return payload_;
    }

    node.server.on('ros connected', () => {
      node.status({fill:"green",shape:"dot",text:"connected"});
    });

    node.server.on('ros error', () => {
      node.status({fill:"red",shape:"dot",text:"error"});
    });

  }
}
