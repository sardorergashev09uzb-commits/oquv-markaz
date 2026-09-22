CREATE TABLE IF NOT EXISTS `user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `auth_key` varchar(32) COLLATE utf8_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `password_reset_token` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `email` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `status` smallint(6) NOT NULL DEFAULT 10,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  `verification_token` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `name` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `phone` varchar(50) COLLATE utf8_unicode_ci DEFAULT NULL,
  `role` varchar(50) COLLATE utf8_unicode_ci DEFAULT 'student',
  `avatar` varchar(255) COLLATE utf8_unicode_ci DEFAULT NULL,
  `center_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `password_reset_token` (`password_reset_token`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

CREATE TABLE IF NOT EXISTS `course` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `duration_months` int(11) NOT NULL,
  `price` int(11) NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `room` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `group` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `course_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `schedule_days` varchar(255) NOT NULL,
  `start_time` varchar(10) NOT NULL,
  `end_time` varchar(10) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `student_group` (
  `student_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `joined_at` date NOT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`student_id`,`group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `plan_id` int(11) DEFAULT NULL,
  `amount` int(11) NOT NULL,
  `method` varchar(50) NOT NULL,
  `paid_at` datetime NOT NULL,
  `received_by` int(11) NOT NULL,
  `note` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `payment_plan` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `total_amount` int(11) NOT NULL,
  `paid_amount` int(11) NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL,
  `due_date` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `expense` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL,
  `amount` int(11) NOT NULL,
  `description` text,
  `date` date NOT NULL,
  `created_by` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `teacher_salary` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) NOT NULL,
  `month` varchar(10) NOT NULL,
  `type` varchar(50) NOT NULL,
  `amount` int(11) NOT NULL,
  `paid_amount` int(11) NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL,
  `paid_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lead` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `course_id` int(11) DEFAULT NULL,
  `source` varchar(50) DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `notes` text,
  `assigned_to` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lead_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lead_id` int(11) NOT NULL,
  `action` varchar(50) NOT NULL,
  `note` text,
  `created_by` int(11) NOT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `announcement` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `target_type` varchar(50) NOT NULL,
  `author_id` int(11) NOT NULL,
  `published_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `notification` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `certificate` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `cert_number` varchar(100) NOT NULL,
  `final_score` float DEFAULT NULL,
  `issued_at` date NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cert_number` (`cert_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `lesson` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `date` date NOT NULL,
  `topic` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lesson_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `status` varchar(20) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `assessment` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL,
  `max_score` float NOT NULL,
  `date` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `assessment_score` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assessment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `score` float NOT NULL,
  `feedback` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `homework` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `deadline` date NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert SUPER ADMIN
INSERT IGNORE INTO `user` (`username`, `auth_key`, `password_hash`, `email`, `status`, `created_at`, `updated_at`, `name`, `phone`, `role`) VALUES
('admin', 'xyz123', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'admin@example.com', 10, 1690000000, 1690000000, 'Direktor', '+998901234567', 'super_admin');

-- Insert Dummy Data
INSERT IGNORE INTO `course` (`title`, `description`, `duration_months`, `price`, `status`, `created_at`, `updated_at`) VALUES
('General English', 'Noldan boshlab o''rganish uchun', 6, 450000, 1, 1690000000, 1690000000),
('IELTS Rocket', 'Intensiv IELTS tayyorgarlik', 3, 600000, 1, 1690000000, 1690000000);

INSERT IGNORE INTO `room` (`name`, `capacity`, `type`, `status`) VALUES
('101-xona', 15, 'standard', 1),
('102-xona', 12, 'computer_lab', 1);

INSERT IGNORE INTO `user` (`username`, `auth_key`, `password_hash`, `email`, `status`, `created_at`, `updated_at`, `name`, `phone`, `role`) VALUES
('teacher1', 'xyz123', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'teacher1@example.com', 10, 1690000000, 1690000000, 'Alisher O''qituvchi', '+998991112233', 'teacher'),
('student1', 'xyz123', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'student1@example.com', 10, 1690000000, 1690000000, 'Tohir O''quvchi', '+998903334455', 'student');

INSERT IGNORE INTO `group` (`course_id`, `name`, `teacher_id`, `schedule_days`, `start_time`, `end_time`, `start_date`, `end_date`, `room_id`, `status`, `created_at`, `updated_at`) VALUES
(1, 'GE-Beginner-1', 2, '["Mon","Wed","Fri"]', '14:00', '15:30', '2026-09-01', '2027-03-01', 1, 1, 1690000000, 1690000000);

INSERT IGNORE INTO `student_group` (`student_id`, `group_id`, `joined_at`, `status`) VALUES
(3, 1, '2026-09-01', 1);

INSERT IGNORE INTO `payment` (`student_id`, `plan_id`, `amount`, `method`, `paid_at`, `received_by`, `note`) VALUES
(3, NULL, 450000, 'cash', '2026-09-05 10:00:00', 1, 'Sentabr uchun to''lov');
