// This Haraka 'plugin' implements the FwdMX service.

var dns = require('dns');
var http = require('http');
var https = require('https');
var url = require('url');
var querystring = require('querystring');

var outbound = require('./outbound');
var Address = require('./address').Address;

var haraka;

// takes an email address and performs DNS lookups to return an array of actions to be taken, or an error.
function getFwdList(email, cb){
  var address = new Address(email);
  var fwds = [];

  // first look for the user forwarding instructions.
  haraka.loginfo("Checking for txt record for " + address.user + "._fwdmx." + address.host);
  dns.resolveTxt(address.user + '._fwdmx.' + address.host,
                 function(err, addresses){

    // we found a user-specific forward, use that.
    if(!err) {

      haraka.loginfo("Found txt record(s):");

      // add each forwarding MX record to the list.
      addresses.forEach(function (a) {
        haraka.loginfo("  " + a);
        fwds.push(a);
      });

      // callback and we're done.
      cb(fwds);
   
    } else {

      // whoops, no user-specific forwards, try and find a catch-all?
      haraka.loginfo("No user-specific records, checking for catch-all txt record _fwdmx." + address.host);
      dns.resolveTxt('_fwdmx.' + address.host,
        function(err, addresses){

          // cool, we found a catch-all.
          if(!err) {

 	    haraka.loginfo("Found catch-all txt record:");

            // add each forwarding MX record to the list.
            addresses.forEach(function (a) {
              haraka.loginfo("  " + a);
              fwds.push(a);
            });

          }

          // okay, we're all done. (empty array gets returned if no record found)
          cb(fwds);
        });
    }
  });
}


// calls the given URL with the JSON representation of the connection object.
function webhook(hookurl, connection, next){

  haraka.loginfo("Running webhook to " + hookurl);

  var trans = connection.transaction;

  var u = url.parse(hookurl);

  var post_data = querystring.stringify({
    Headers: trans.header.headers,
    Sender: trans.mail_from.original,
    SenderIP: connection.remote_ip,
    Body: trans.body
  });

  var port = u.port? u.port : ((u.protocol == 'https')? 443 : 80);
  var path = u.path? u.path : '/';

  var post_options = {
    host: u.hostname,
    port: port,
    path: path,
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': post_data.length
    }
  }

  haraka.loginfo(" post data is " + post_data);

  var agent = (u.protocol == 'https')? https : http;

  var post_req = agent.request(post_options, function(res) {
    if(res.statusCode == 200) {
      haraka.loginfo(" success response was " + querystring.stringify(res));
      next(OK, "Webhook success.");
    } else {
      haraka.loginfo(" fail response was " + querystring.stringify(res));
      next(DENY, "Webhook failed w/err " + res.statusCode);
    }
  });  
  
  // write parameters to post body  
  post_req.write(post_data);  
  post_req.end();  
}

// called when the inbound message is queued for delivery.
exports.fwdmx_onQueue = function (next, connection) {
  var t = connection.transaction;
  var fwds = t.notes.fwds;
  fwds.forEach(function(fwd) {
    if(fwd.substring(0,7) == 'mailto:'){ // this forward is to an email address!
      var new_rcpt_to = [];
      var emails = fwd.substring(7).split(',');
      emails.forEach(function(e){ new_rcpt_to.push(new Address(e)); });
      t.add_header('X-FwdMX-Original-RCPT', t.rcpt_to.join());
      t.add_header('X-Forwarded-To', emails.join());
      t.add_header('Resent-Sender', emails.join());
      t.rcpt_to = new_rcpt_to;
      haraka.loginfo("sending emails to " + emails.join());
      outbound.send_trans_email(t, next);
      // next(OK, "Anchors away!");
    }
    if(fwd.substring(0,7) == 'http://'){ // webhook
      webhook(fwd, connection, next);
    }
    if(fwd.substring(0,8) == 'https://'){ // webhook
      webhook(fwd, connection, next);
    }
  });
};

exports.register = function () {
    this.register_hook('queue','fwdmx_onQueue');
};

exports.hook_rcpt = function (next, connection, params) {
  haraka = this;
  haraka.loginfo("Checking " + params[0] + " FwdMX records");
  getFwdList(params[0], function(fwds){
    if(fwds.length == 0) {
      next(DENY, 'WTF?! I do not know how to deliver to that address.');
    } else {
      connection.transaction.notes.fwds = fwds;
      connection.transaction.parse_body = 1;
      next(OK, 'Please do go on. I think I know what to do with that email.');
    }
  });

};
