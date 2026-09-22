-- O'quv Markaz ERP to'liq va to'g'ri sxemasi

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `user_tokens`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `user`;
DROP TABLE IF EXISTS `student_documents`;
DROP TABLE IF EXISTS `homework_submissions`;
DROP TABLE IF EXISTS `homework`;
DROP TABLE IF EXISTS `certificates`;
DROP TABLE IF EXISTS `certificate`;
DROP TABLE IF EXISTS `attendance`;
DROP TABLE IF EXISTS `assessment_scores`;
DROP TABLE IF EXISTS `assessment_score`;
DROP TABLE IF EXISTS `assessments`;
DROP TABLE IF EXISTS `assessment`;
DROP TABLE IF EXISTS `lessons`;
DROP TABLE IF EXISTS `lesson`;
DROP TABLE IF EXISTS `group_students`;
DROP TABLE IF EXISTS `student_group`;
DROP TABLE IF EXISTS `groups`;
DROP TABLE IF EXISTS `group`;
DROP TABLE IF EXISTS `rooms`;
DROP TABLE IF EXISTS `room`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `course`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `payment`;
DROP TABLE IF EXISTS `payment_plans`;
DROP TABLE IF EXISTS `payment_plan`;
DROP TABLE IF EXISTS `teacher_salaries`;
DROP TABLE IF EXISTS `teacher_salary`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `expense`;
DROP TABLE IF EXISTS `lead_activities`;
DROP TABLE IF EXISTS `lead_activity`;
DROP TABLE IF EXISTS `leads`;
DROP TABLE IF EXISTS `lead`;
DROP TABLE IF EXISTS `announcements`;
DROP TABLE IF EXISTS `announcement`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `notification`;

-- 1. users
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `auth_key` varchar(32) NOT NULL,
  `role` varchar(50) NOT NULL DEFAULT 'student',
  `avatar` varchar(255) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 10,
  `center_id` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. user_tokens
CREATE TABLE `user_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'refresh',
  `expired_at` int(11) NOT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. courses
CREATE TABLE `courses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `level` varchar(100) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `duration_months` int(11) NOT NULL DEFAULT 1,
  `price` int(11) NOT NULL DEFAULT 0,
  `center_id` int(11) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. rooms
CREATE TABLE `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `capacity` int(11) NOT NULL DEFAULT 20,
  `center_id` int(11) DEFAULT NULL,
  `status` int(11) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. groups
CREATE TABLE `groups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `course_id` int(11) NOT NULL,
  `teacher_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `schedule_json` text DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `max_students` int(11) NOT NULL DEFAULT 20,
  `center_id` int(11) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. group_students
CREATE TABLE `group_students` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `enrolled_at` date NOT NULL,
  `left_at` date DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  KEY `group_id` (`group_id`),
  KEY `student_id` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. lessons
CREATE TABLE `lessons` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `topic` varchar(255) DEFAULT NULL,
  `started_at` datetime NOT NULL,
  `ended_at` datetime DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'planned',
  `note` text DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. attendance
CREATE TABLE `attendance` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lesson_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'present',
  `note` varchar(255) DEFAULT NULL,
  `marked_by` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. homework
CREATE TABLE `homework` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lesson_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `deadline` datetime DEFAULT NULL,
  `max_score` int(11) NOT NULL DEFAULT 100,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. homework_submissions
CREATE TABLE `homework_submissions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `homework_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `file_url` varchar(255) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `score` float DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'submitted',
  `submitted_at` int(11) DEFAULT NULL,
  `graded_at` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. assessments
CREATE TABLE `assessments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `group_id` int(11) NOT NULL,
  `lesson_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'exam',
  `max_score` int(11) NOT NULL DEFAULT 100,
  `date` date NOT NULL,
  `deadline` datetime DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. assessment_scores
CREATE TABLE `assessment_scores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assessment_id` int(11) NOT NULL,
  `student_id` int(11) NOT NULL,
  `score` float DEFAULT NULL,
  `feedback` text DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'graded',
  `graded_by` int(11) DEFAULT NULL,
  `graded_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. payment_plans
CREATE TABLE `payment_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `month` varchar(20) NOT NULL,
  `amount` int(11) NOT NULL DEFAULT 0,
  `paid_amount` int(11) NOT NULL DEFAULT 0,
  `due_date` date NOT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. payments
CREATE TABLE `payments` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `plan_id` int(11) NOT NULL,
  `amount` int(11) NOT NULL,
  `method` varchar(50) NOT NULL DEFAULT 'cash',
  `received_by` int(11) DEFAULT NULL,
  `paid_at` datetime NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. teacher_salaries
CREATE TABLE `teacher_salaries` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `teacher_id` int(11) NOT NULL,
  `month` varchar(20) NOT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'fixed',
  `lessons_count` int(11) DEFAULT NULL,
  `rate` int(11) DEFAULT NULL,
  `amount` int(11) NOT NULL DEFAULT 0,
  `paid_amount` int(11) NOT NULL DEFAULT 0,
  `status` varchar(50) NOT NULL DEFAULT 'pending',
  `paid_at` datetime DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. expenses
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(100) NOT NULL,
  `amount` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `date` date NOT NULL,
  `center_id` int(11) DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. leads
CREATE TABLE `leads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `phone` varchar(50) NOT NULL,
  `course_id` int(11) DEFAULT NULL,
  `source` varchar(100) DEFAULT NULL,
  `status` varchar(50) NOT NULL DEFAULT 'new',
  `notes` text DEFAULT NULL,
  `assigned_to` int(11) DEFAULT NULL,
  `center_id` int(11) DEFAULT NULL,
  `converted_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `updated_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 18. lead_activities
CREATE TABLE `lead_activities` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `lead_id` int(11) NOT NULL,
  `action` varchar(100) NOT NULL,
  `note` text DEFAULT NULL,
  `created_by` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 19. announcements
CREATE TABLE `announcements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `author_id` int(11) NOT NULL,
  `target_type` varchar(50) NOT NULL DEFAULT 'all',
  `target_id` int(11) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `center_id` int(11) DEFAULT NULL,
  `published_at` int(11) NOT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 20. notifications
CREATE TABLE `notifications` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `body` text DEFAULT NULL,
  `type` varchar(50) DEFAULT NULL,
  `data_json` text DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 21. certificates
CREATE TABLE `certificates` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `group_id` int(11) NOT NULL,
  `cert_number` varchar(100) NOT NULL,
  `final_score` float DEFAULT NULL,
  `issued_at` date NOT NULL,
  `pdf_url` varchar(255) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 22. student_documents
CREATE TABLE `student_documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `student_id` int(11) NOT NULL,
  `type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `file_url` varchar(255) NOT NULL,
  `created_at` int(11) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- Boshlang'ich Super Admin foydalanuvchisi (Login: admin@example.com / Parol: admin123)
INSERT INTO `users` (`id`, `name`, `phone`, `email`, `password_hash`, `auth_key`, `role`, `status`, `created_at`, `updated_at`) VALUES
(1, 'Direktor', '+998901234567', 'admin@example.com', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'xyz123', 'super_admin', 10, 1690000000, 1690000000);
