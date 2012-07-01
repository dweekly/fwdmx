<?php 
  // Step 1: Download the Twilio-PHP library from twilio.com/docs/libraries,  
  // and move it into the folder containing this file. 
require "twilio-php/Services/Twilio.php"; 
  
// Step 2: set our AccountSid and AuthToken from www.twilio.com/user/account 
$AccountSid = "AC___"; 
$AuthToken = "____";
  
// Step 3: instantiate a new Twilio Rest Client 
$client = new Services_Twilio($AccountSid, $AuthToken); 
  
// Step 4: make an array of people we know, to send them a message.  
// Feel free to change/add your own phone number and name here. 
$people = array( 
                "+14155551212" => "Test", 
                ); 
  
// Step 5: Loop over all our friends. $number is a phone number above, and  
// $name is the name next to it 
foreach ($people as $number => $name) { 
  
  $sms = $client->account->sms_messages->create( 
           "415-689-3457",  
           $number, 
           "EMAIL! " . $_REQUEST['Subject'] . " from " . $_REQUEST['Sender']); 
  
  // Display a confirmation message on the screen 
  echo "Sent message to $name"; 
} 
