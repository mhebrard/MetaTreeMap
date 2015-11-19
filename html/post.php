<!DOCTYPE html>
<html>
  <head>
    <meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>
	<title>Thanks</title>
	</head>
  <body>
	<h1>MetaTreeMap - Feedback</h1>
	<div>Thank You for your feedback.</div>
  </body>
</html>

<?php 
$config = array(
	'url'    => 'http://metasystems.riken.jp/projects/issues.json',
	'header' => array(
        'X-Redmine-API-Key: c6663722856684aa0b0a429d8f8906b721b7ced8',
		'Content-Type: application/json'
    ),
	'trackers' => array(
		"bug"        => 1,
        "feature"    => 2,
        "support"    => 3,
        "request"    => 8,
        "suggestion" => 17,
        "other"      => 19
	)
);

$description = 'From: '.$_POST["name"]."\n"
			 .'Email: '.$_POST["email"]."\n\n"
			 .'Message: '.$_POST["message"];

$data = array(
	'issue' => array(
		'project_id' =>  "39",
		'subject'    =>  $_POST["subject"],
		'tracker_id' =>  $config['trackers'][$_POST["type"]],
		'assigned_to_id' => "16",
		'description' => $description
	)
);
$request = json_encode($data);

$curl = curl_init($config["url"]);
curl_setopt($curl, CURLOPT_POST, 1);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
curl_setopt($curl, CURLOPT_HTTPHEADER, $config['header']);
curl_setopt($curl, CURLOPT_POSTFIELDS, $request);
$resp = curl_exec($curl);
curl_close($curl);

?>


