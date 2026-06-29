<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// 🔒 APNI HOSTINGER DATABASE CONNECTION DETAILS YAHAN LIKHEIN
$host = "localhost";
$user = "u388646369_ball15pool"; 
$pass = "Sx:&1Qm9";
$dbname = "u388646369_ball15pool";

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die(json_encode(["success" => false, "error" => "Database failure"]));
}

$action = $_GET['action'] ?? '';
$room_id = $_GET['roomId'] ?? '';

if (empty($room_id)) {
    die(json_encode(["success" => false, "error" => "Token Missing"]));
}

// 📡 ACTION 1: FETCH MATCH STATE
if ($action === 'fetch') {
    $stmt = $conn->prepare("SELECT current_player, balls_data, cue_ball_x, cue_ball_y FROM rooms_state WHERE room_id = ?");
    $stmt->bind_param("s", $room_id);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode([
            "success" => true,
            "currentPlayer" => (int)$row['current_player'],
            "cueBall" => ["x" => (float)$row['cue_ball_x'], "y" => (float)$row['cue_ball_y']],
            "balls" => json_decode($row['balls_data'])
        ]);
    } else {
        echo json_encode(["success" => false, "error" => "Inactive Room"]);
    }
    $stmt->close();
}

// 💾 ACTION 2: PUSH LATEST MOVE
if ($action === 'push') {
    $data = json_decode(file_get_contents('php://input'), true);
    if (!$data) { die(json_encode(["success" => false, "error" => "No data"])); }
    
    $current_player = $data['currentPlayer'];
    $balls_data = json_encode($data['balls']);
    $cb_x = $data['cueBall']['x'];
    $cb_y = $data['cueBall']['y'];
    
    $stmt = $conn->prepare("INSERT INTO rooms_state (room_id, current_player, balls_data, cue_ball_x, cue_ball_y) 
                            VALUES (?, ?, ?, ?, ?) 
                            ON DUPLICATE KEY UPDATE current_player=?, balls_data=?, cue_ball_x=?, cue_ball_y=?");
    $stmt->bind_param("sisddisdd", $room_id, $current_player, $balls_data, $cb_x, $cb_y, $current_player, $balls_data, $cb_x, $cb_y);
    
    if ($stmt->execute()) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["success" => false]);
    }
    $stmt->close();
}

$conn->close();
?>