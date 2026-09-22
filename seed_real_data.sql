-- O'quv Markaz uchun to'liq boshlang'ich ma'lumotlar (Seed Data)

-- 1. Kurslar
INSERT INTO `courses` (`id`, `name`, `level`, `description`, `duration_months`, `price`, `status`, `created_at`, `updated_at`) VALUES
(1, 'General English', 'A1-B2', 'Grammatika, so\'z boyligi, speaking va listening', 6, 450000, 1, 1726000000, 1726000000),
(2, 'IELTS Intensive 7.0+', 'B2-C1', 'IELTS 4 ta bo\'limi bo\'yicha chuqur tayyorgarlik', 3, 700000, 1, 1726000000, 1726000000),
(3, 'Frontend Dasturlash (React & Next.js)', 'Beginner-Pro', 'HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS', 7, 850000, 1, 1726000000, 1726000000),
(4, 'Matematika OTM-2026', '7-11 sinf', 'Oliy ta\'limga tayyorgarlik va mantiqiy fikrlash testlari', 9, 400000, 1, 1726000000, 1726000000),
(5, 'Arab tili (Tajvid & Grammatika)', 'A1-B1', 'Harflar, tajvid qoidalari va so\'zlashuv', 4, 500000, 1, 1726000000, 1726000000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `price` = VALUES(`price`);

-- 2. Auditoriyalar (Rooms)
INSERT INTO `rooms` (`id`, `name`, `capacity`, `status`) VALUES
(1, '101-xona (General)', 24, 1),
(2, '102-xona (IELTS Lab)', 18, 1),
(3, '103-xona (IT Lab)', 20, 1),
(4, '104-xona (Kids Room)', 15, 1),
(5, '201-xona (Speaking Club)', 30, 1)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. O'qituvchilar va O'quvchilar
INSERT INTO `users` (`id`, `name`, `phone`, `email`, `password_hash`, `auth_key`, `role`, `status`, `created_at`, `updated_at`) VALUES
(2, 'Azizbek Karimov', '+998901112233', 'teacher1@example.com', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'xyz123', 'teacher', 10, 1726000000, 1726000000),
(3, 'Malika Yusupova', '+998902223344', 'teacher2@example.com', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'xyz123', 'teacher', 10, 1726000000, 1726000000),
(4, 'Ali Valiyev', '+998903334455', 'student1@example.com', '$2y$10$7uSK6k4egHMFXpgG5i1yeuAnhdqPL7RfJPLotkBfZPAXC1vXgh.B.', 'xyz123', 'student', 10, 1726000000, 1726000000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 4. Guruhlar (Groups) — dars jadvali bilan
INSERT INTO `groups` (`id`, `name`, `course_id`, `teacher_id`, `room_id`, `schedule_json`, `start_date`, `end_date`, `max_students`, `status`, `created_at`, `updated_at`) VALUES
(1, 'General English B1 (Kechki)', 1, 2, 1, '[{"day":"Dush","time":"18:30 - 20:30"},{"day":"Chor","time":"18:30 - 20:30"},{"day":"Jum","time":"18:30 - 20:30"}]', '2026-09-01', '2027-02-28', 18, 'active', 1726000000, 1726000000),
(2, 'IELTS Rocket-12', 2, 2, 2, '[{"day":"Sesh","time":"14:00 - 16:00"},{"day":"Pay","time":"14:00 - 16:00"},{"day":"Shan","time":"14:00 - 16:00"}]', '2026-09-05', '2026-12-15', 16, 'active', 1726000000, 1726000000),
(3, 'Frontend Web Bootcamp', 3, 3, 3, '[{"day":"Dush","time":"14:00 - 16:00"},{"day":"Chor","time":"14:00 - 16:00"},{"day":"Jum","time":"14:00 - 16:00"}]', '2026-09-10', '2027-04-10', 15, 'active', 1726000000, 1726000000)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `schedule_json` = VALUES(`schedule_json`);

-- 5. O'quvchilarni guruhlarga biriktirish
INSERT INTO `group_students` (`id`, `group_id`, `student_id`, `enrolled_at`, `status`) VALUES
(1, 1, 4, '2026-09-01', 'active'),
(2, 3, 4, '2026-09-10', 'active')
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);

-- Agar bazada boshqa o'quvchilar bo'lsa (masalan sardorbek), ularni ham biriktiramiz
INSERT IGNORE INTO `group_students` (`group_id`, `student_id`, `enrolled_at`, `status`)
SELECT 1, id, '2026-09-01', 'active' FROM `users` WHERE `role` = 'student' AND id NOT IN (4);

INSERT IGNORE INTO `group_students` (`group_id`, `student_id`, `enrolled_at`, `status`)
SELECT 3, id, '2026-09-10', 'active' FROM `users` WHERE `role` = 'student' AND id NOT IN (4);

-- 6. To'lov rejalari (Payment Plans)
INSERT INTO `payment_plans` (`id`, `student_id`, `group_id`, `month`, `amount`, `paid_amount`, `due_date`, `status`, `created_at`, `updated_at`) VALUES
(1, 4, 1, '2026-09', 450000, 450000, '2026-09-10', 'paid', 1726000000, 1726000000),
(2, 4, 3, '2026-09', 850000, 850000, '2026-09-10', 'paid', 1726000000, 1726000000)
ON DUPLICATE KEY UPDATE `paid_amount` = VALUES(`paid_amount`), `status` = VALUES(`status`);

-- Sardorbek yoki boshqa o'quvchilar uchun to'lov rejasi
INSERT IGNORE INTO `payment_plans` (`student_id`, `group_id`, `month`, `amount`, `paid_amount`, `due_date`, `status`, `created_at`, `updated_at`)
SELECT id, 1, '2026-09', 450000, 450000, '2026-09-10', 'paid', 1726000000, 1726000000 FROM `users` WHERE `role` = 'student' AND id NOT IN (4);

-- 7. To'lovlar tarixi (Payments Transactions)
INSERT INTO `payments` (`id`, `plan_id`, `amount`, `method`, `received_by`, `paid_at`, `note`, `created_at`) VALUES
(1, 1, 450000, 'payme', 1, '2026-09-08 11:30:00', 'Payme orqali to\'liq to\'lov', 1726000000),
(2, 2, 850000, 'click', 1, '2026-09-09 15:45:00', 'Click orqali to\'lov', 1726000000)
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- 8. E'lonlar (Announcements)
INSERT INTO `announcements` (`id`, `author_id`, `target_type`, `title`, `content`, `published_at`, `created_at`) VALUES
(1, 1, 'all', '🎉 Yangi o\'quv yili boshlanishi munosabati bilan tabrik!', 'Hurmatli o\'quvchilar va ustozlar! Markazimizda yangi o\'quv mavsumi rasman boshlandi. Barchangizga muvaffaqiyatlar tilaymiz.', 1726000000, 1726000000),
(2, 1, 'all', '🏆 Yakshanba kungi Mock IELTS va IT Speaking Club', 'Ushbu yakshanba soat 10:00 da barcha o\'quvchilar uchun bepul Mock IELTS va dasturlash bo\'yicha Speaking Club bo\'lib o\'tadi. Ro\'yxatdan o\'tish shart emas.', 1726500000, 1726500000),
(3, 1, 'all', '📢 Oylik to\'lovlar va kvitansiyalar haqida eslatma', 'Oylik o\'quv to\'lovlarini har oyning 10-sanasiga qadar amalga oshirishingizni so\'raymiz. To\'lov holatini shaxsiy kabinetingizdan tekshirib borishingiz mumkin.', 1726800000, 1726800000)
ON DUPLICATE KEY UPDATE `title` = VALUES(`title`), `content` = VALUES(`content`);

-- 9. Darslar va Davomat (Lessons & Attendance)
INSERT INTO `lessons` (`id`, `group_id`, `topic`, `started_at`, `ended_at`, `status`, `created_at`) VALUES
(1, 1, 'Present Perfect vs Past Simple', '2026-09-18 18:30:00', '2026-09-18 20:30:00', 'completed', 1726600000),
(2, 1, 'Conditionals & Modals', '2026-09-21 18:30:00', '2026-09-21 20:30:00', 'completed', 1726800000),
(3, 3, 'React Hooks: useState & useEffect', '2026-09-21 14:00:00', '2026-09-21 16:00:00', 'completed', 1726800000)
ON DUPLICATE KEY UPDATE `topic` = VALUES(`topic`);

INSERT INTO `attendance` (`id`, `lesson_id`, `student_id`, `status`, `note`, `marked_by`, `created_at`) VALUES
(1, 1, 4, 'present', 'Faol qatnashdi', 2, 1726600000),
(2, 2, 4, 'present', 'Uy vazifasi bajarilgan', 2, 1726800000),
(3, 3, 4, 'present', 'A\'lo', 3, 1726800000)
ON DUPLICATE KEY UPDATE `status` = VALUES(`status`);
