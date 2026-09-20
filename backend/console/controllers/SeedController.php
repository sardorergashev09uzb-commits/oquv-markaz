<?php

declare(strict_types=1);

namespace console\controllers;

use common\models\Announcement;
use common\models\Certificate;
use common\models\Course;
use common\models\Expense;
use common\models\Group;
use common\models\GroupStudent;
use common\models\Lead;
use common\models\LeadActivity;
use common\models\Notification;
use common\models\Payment;
use common\models\PaymentPlan;
use common\models\Room;
use common\models\TeacherSalary;
use common\models\User;
use Yii;
use yii\console\Controller;
use yii\console\ExitCode;

/**
 * SeedController — Test va boshlang'ich ma'lumotlarni generatsiya qilish
 */
class SeedController extends Controller
{
    public function actionIndex(): int
    {
        $this->stdout("🌱 Ma'lumotlarni bazaga kiritish boshlandi...\n");

        // 1. Xonalar
        $roomsData = [
            ['name' => '101-xona (General)', 'capacity' => 24],
            ['name' => '102-xona (IELTS Lab)', 'capacity' => 18],
            ['name' => '103-xona (IT Lab)', 'capacity' => 20],
            ['name' => '104-xona (Kids Room)', 'capacity' => 15],
            ['name' => '201-xona (Speaking Club)', 'capacity' => 30],
        ];

        $rooms = [];
        foreach ($roomsData as $r) {
            $room = Room::findOne(['name' => $r['name']]) ?? new Room();
            $room->name = $r['name'];
            $room->capacity = $r['capacity'];
            $room->status = Room::STATUS_ACTIVE;
            $room->save(false);
            $rooms[] = $room;
        }
        $this->stdout("✅ " . count($rooms) . " ta xona yaratildi/yangilandi.\n");

        // 2. Kurslar
        $coursesData = [
            [
                'name' => 'General English (Beginner to Upper)',
                'level' => 'A1-B2',
                'description' => 'Grammatika, so\'z boyligi, o\'qish va tinglab tushunish ko\'nikmalari.',
                'duration_months' => 6,
                'price' => 450000,
            ],
            [
                'name' => 'IELTS Intensive 7.0+',
                'level' => 'B2-C1',
                'description' => 'IELTS 4 ta bo\'limi bo\'yicha chuqurlashtirilgan tayyorgarlik va mock testlar.',
                'duration_months' => 3,
                'price' => 700000,
            ],
            [
                'name' => 'Frontend Dasturlash (React & Next.js)',
                'level' => 'Beginner-Pro',
                'description' => 'HTML, CSS, JavaScript, TypeScript, React, Next.js, Tailwind CSS.',
                'duration_months' => 7,
                'price' => 850000,
            ],
            [
                'name' => 'Matematika (Milliy va Xalqaro sertifikat)',
                'level' => '7-11 sinf',
                'description' => 'Oliy ta\'limga tayyorgarlik va mantiqiy fikrlash testlari.',
                'duration_months' => 9,
                'price' => 400000,
            ],
            [
                'name' => 'Arab tili (Tajvid & So\'zlashuv)',
                'level' => 'A1-B1',
                'description' => 'Harflar, qoidalar, tajvid va kundalik nutq.',
                'duration_months' => 4,
                'price' => 500000,
            ],
        ];

        $courses = [];
        foreach ($coursesData as $c) {
            $course = Course::findOne(['name' => $c['name']]) ?? new Course();
            $course->attributes = $c;
            $course->status = Course::STATUS_ACTIVE;
            $course->save(false);
            $courses[] = $course;
        }
        $this->stdout("✅ " . count($courses) . " ta kurs yaratildi/yangilandi.\n");

        // 3. O'qituvchilar (Teachers)
        $teachersData = [
            ['name' => 'Azizbek Karimov', 'phone' => '+998901112233', 'email' => 'karimov@oquvmarkaz.uz'],
            ['name' => 'Malika Yusupova', 'phone' => '+998902223344', 'email' => 'yusupova@oquvmarkaz.uz'],
            ['name' => 'Javohir Qodirov', 'phone' => '+998903334455', 'email' => 'qodirov@oquvmarkaz.uz'],
            ['name' => 'Nilufar Hasanova', 'phone' => '+998904445566', 'email' => 'hasanova@oquvmarkaz.uz'],
        ];

        $teachers = [];
        foreach ($teachersData as $t) {
            $teacher = User::findByPhone($t['phone']) ?? new User();
            $teacher->name = $t['name'];
            $teacher->phone = $t['phone'];
            $teacher->email = $t['email'];
            $teacher->role = User::ROLE_TEACHER;
            $teacher->status = User::STATUS_ACTIVE;
            if (!$teacher->password_hash) {
                $teacher->setPassword('Teacher123!');
            }
            if (!$teacher->auth_key) {
                $teacher->generateAuthKey();
            }
            $teacher->save(false);
            $teachers[] = $teacher;
        }
        $this->stdout("✅ " . count($teachers) . " ta o'qituvchi tayyor.\n");

        // 4. Guruhlar (Groups)
        $groupsData = [
            [
                'name' => 'IELTS Rocket-12',
                'course_id' => $courses[1]->id,
                'teacher_id' => $teachers[0]->id,
                'room_id' => $rooms[1]->id,
                'schedule_json' => json_encode([
                    ['day' => 'Dush', 'time' => '14:00 - 16:00'],
                    ['day' => 'Chor', 'time' => '14:00 - 16:00'],
                    ['day' => 'Jum', 'time' => '14:00 - 16:00'],
                ], JSON_UNESCAPED_UNICODE),
                'start_date' => date('Y-m-d', strtotime('-1 month')),
                'max_students' => 16,
                'status' => Group::STATUS_ACTIVE,
            ],
            [
                'name' => 'General English B1 (Kechki)',
                'course_id' => $courses[0]->id,
                'teacher_id' => $teachers[1]->id,
                'room_id' => $rooms[0]->id,
                'schedule_json' => json_encode([
                    ['day' => 'Sesh', 'time' => '18:30 - 20:30'],
                    ['day' => 'Pay', 'time' => '18:30 - 20:30'],
                    ['day' => 'Shan', 'time' => '18:30 - 20:30'],
                ], JSON_UNESCAPED_UNICODE),
                'start_date' => date('Y-m-d', strtotime('-2 weeks')),
                'max_students' => 18,
                'status' => Group::STATUS_ACTIVE,
            ],
            [
                'name' => 'Frontend Web Pro',
                'course_id' => $courses[2]->id,
                'teacher_id' => $teachers[2]->id,
                'room_id' => $rooms[2]->id,
                'schedule_json' => json_encode([
                    ['day' => 'Dush', 'time' => '16:00 - 18:00'],
                    ['day' => 'Chor', 'time' => '16:00 - 18:00'],
                    ['day' => 'Jum', 'time' => '16:00 - 18:00'],
                ], JSON_UNESCAPED_UNICODE),
                'start_date' => date('Y-m-d', strtotime('-1 month')),
                'max_students' => 15,
                'status' => Group::STATUS_ACTIVE,
            ],
            [
                'name' => 'Matematika OTM-2026',
                'course_id' => $courses[3]->id,
                'teacher_id' => $teachers[3]->id,
                'room_id' => $rooms[4]->id,
                'schedule_json' => json_encode([
                    ['day' => 'Sesh', 'time' => '15:00 - 17:00'],
                    ['day' => 'Pay', 'time' => '15:00 - 17:00'],
                    ['day' => 'Shan', 'time' => '15:00 - 17:00'],
                ], JSON_UNESCAPED_UNICODE),
                'start_date' => date('Y-m-d', strtotime('-3 weeks')),
                'max_students' => 20,
                'status' => Group::STATUS_ACTIVE,
            ],
        ];

        $groups = [];
        foreach ($groupsData as $g) {
            $group = Group::findOne(['name' => $g['name']]) ?? new Group();
            $group->attributes = $g;
            $group->save(false);
            $groups[] = $group;
        }
        $this->stdout("✅ " . count($groups) . " ta guruh tayyor.\n");

        // 5. O'quvchilar (Students)
        $studentsData = [
            ['name' => 'Ali Valiyev', 'phone' => '+998931110001', 'email' => 'ali@example.com'],
            ['name' => 'Shahzod Rustamov', 'phone' => '+998931110002', 'email' => 'shahzod@example.com'],
            ['name' => 'Madina Rahimova', 'phone' => '+998931110003', 'email' => 'madina@example.com'],
            ['name' => 'Dostonbek Ergashev', 'phone' => '+998931110004', 'email' => 'doston@example.com'],
            ['name' => 'Sevara Karimova', 'phone' => '+998931110005', 'email' => 'sevara@example.com'],
            ['name' => 'Bekzod Toshev', 'phone' => '+998931110006', 'email' => 'bekzod@example.com'],
            ['name' => 'Dilnoza Boboyeva', 'phone' => '+998931110007', 'email' => 'dilnoza@example.com'],
            ['name' => 'Otabek Mirzayev', 'phone' => '+998931110008', 'email' => 'otabek@example.com'],
            ['name' => 'Zarina Akbarova', 'phone' => '+998931110009', 'email' => 'zarina@example.com'],
            ['name' => 'Sanjar Xoliqov', 'phone' => '+998931110010', 'email' => 'sanjar@example.com'],
        ];

        $students = [];
        foreach ($studentsData as $idx => $s) {
            $student = User::findByPhone($s['phone']) ?? new User();
            $student->name = $s['name'];
            $student->phone = $s['phone'];
            $student->email = $s['email'];
            $student->role = User::ROLE_STUDENT;
            $student->status = User::STATUS_ACTIVE;
            if (!$student->password_hash) {
                $student->setPassword('Student123!');
            }
            if (!$student->auth_key) {
                $student->generateAuthKey();
            }
            $student->save(false);
            $students[] = $student;

            // Guruhga biriktirish
            $assignedGroup = $groups[$idx % count($groups)];
            $gs = GroupStudent::findOne(['group_id' => $assignedGroup->id, 'student_id' => $student->id]) ?? new GroupStudent();
            $gs->group_id = $assignedGroup->id;
            $gs->student_id = $student->id;
            $gs->enrolled_at = date('Y-m-d', strtotime('-' . ($idx * 2) . ' days'));
            $gs->status = GroupStudent::STATUS_ACTIVE;
            $gs->save(false);
        }
        $this->stdout("✅ " . count($students) . " ta o'quvchi guruhlarga biriktirildi.\n");

        // 6. To'lov rejalari va To'lovlar (Finance)
        $currentMonth = date('Y-m');
        $superAdmin = User::findOne(['role' => User::ROLE_SUPER_ADMIN]);

        $plansCount = 0;
        $paymentsCount = 0;

        foreach ($students as $idx => $student) {
            $gs = GroupStudent::findOne(['student_id' => $student->id, 'status' => GroupStudent::STATUS_ACTIVE]);
            if (!$gs || !$gs->group) continue;

            $group = $gs->group;
            $coursePrice = $group->course ? $group->course->price : 500000;

            $plan = PaymentPlan::findOne(['student_id' => $student->id, 'group_id' => $group->id, 'month' => $currentMonth]) ?? new PaymentPlan();
            $plan->student_id = $student->id;
            $plan->group_id = $group->id;
            $plan->month = $currentMonth;
            $plan->amount = $coursePrice;
            $plan->due_date = date('Y-m-10'); // Har oyning 10-sanasi
            $plan->save(false);
            $plansCount++;

            // 1-4 o'quvchi to'liq to'lagan
            if ($idx < 4) {
                $pay = Payment::findOne(['plan_id' => $plan->id]) ?? new Payment();
                $pay->plan_id = $plan->id;
                $pay->amount = $coursePrice;
                $pay->method = $idx % 2 === 0 ? Payment::METHOD_CLICK : Payment::METHOD_CASH;
                $pay->paid_at = date('Y-m-05 11:30:00');
                $pay->received_by = $superAdmin ? $superAdmin->id : 1;
                $pay->note = "Oylik to'lov to'liq";
                $pay->save(false);
                $paymentsCount++;
            } elseif ($idx < 7) {
                // 5-7 qisman to'lagan
                $partial = (int) ($coursePrice / 2);
                $pay = Payment::findOne(['plan_id' => $plan->id]) ?? new Payment();
                $pay->plan_id = $plan->id;
                $pay->amount = $partial;
                $pay->method = Payment::METHOD_PAYME;
                $pay->paid_at = date('Y-m-08 15:45:00');
                $pay->received_by = $superAdmin ? $superAdmin->id : 1;
                $pay->note = "Bo'lib to'lash (1-qism)";
                $pay->save(false);
                $paymentsCount++;
            }
            // qolganlar (8-10) to'lamagan, status overdue yoki pending bo'ladi

            $plan->recalculateStatus();
        }
        $this->stdout("✅ {$plansCount} ta to'lov rejasi va {$paymentsCount} ta to'lov kiritildi.\n");

        // 7. Xarajatlar (Expenses)
        $expensesData = [
            ['category' => Expense::CATEGORY_RENT, 'amount' => 4500000, 'description' => "O'quv binosi oylik ijara haqi", 'date' => date('Y-m-01')],
            ['category' => Expense::CATEGORY_ADS, 'amount' => 1200000, 'description' => "Instagram va Telegram targeted reklama", 'date' => date('Y-m-04')],
            ['category' => Expense::CATEGORY_INTERNET, 'amount' => 350000, 'description' => "Sarkor Telecom optik internet", 'date' => date('Y-m-02')],
            ['category' => Expense::CATEGORY_OTHER, 'amount' => 450000, 'description' => "Kantselyariya, markerlar va doska vositalari", 'date' => date('Y-m-06')],
        ];

        foreach ($expensesData as $exp) {
            $expense = Expense::findOne(['description' => $exp['description']]) ?? new Expense();
            $expense->attributes = $exp;
            $expense->created_by = $superAdmin ? $superAdmin->id : 1;
            $expense->save(false);
        }
        $this->stdout("✅ " . count($expensesData) . " ta xarajat kiritildi.\n");

        // 8. O'qituvchilar ish haqi (Teacher Salaries)
        foreach ($teachers as $t) {
            $salary = TeacherSalary::findOne(['teacher_id' => $t->id, 'month' => $currentMonth]) ?? new TeacherSalary();
            $salary->teacher_id = $t->id;
            $salary->month = $currentMonth;
            $salary->type = 'fixed';
            $salary->amount = 4000000;
            $salary->paid_amount = 4000000;
            $salary->status = TeacherSalary::STATUS_PAID;
            $salary->paid_at = date('Y-m-15 10:00:00');
            $salary->save(false);
        }
        // 9. Leadlar (CRM)
        $leadsData = [
            [
                'name' => 'Rustam Sharipov',
                'phone' => '+998971112233',
                'course_id' => $courses[1]->id, // IELTS
                'source' => Lead::SOURCE_INSTAGRAM,
                'status' => Lead::STATUS_NEW,
                'notes' => "Instagram direct orqali murojaat qildi. IELTS guruhiga qiziqmoqda.",
            ],
            [
                'name' => 'Gulnoza Saidova',
                'phone' => '+998972223344',
                'course_id' => $courses[0]->id, // General English
                'source' => Lead::SOURCE_TELEGRAM,
                'status' => Lead::STATUS_CONTACTED,
                'notes' => "Qo'ng'iroq qilindi, dars vaqtlari bilan tanishtirildi.",
            ],
            [
                'name' => 'Bobur Mirzayev',
                'phone' => '+998973334455',
                'course_id' => $courses[2]->id, // Frontend
                'source' => Lead::SOURCE_WEBSITE,
                'status' => Lead::STATUS_TRIAL,
                'notes' => "Dushanba kungi sinov darsiga yozildi.",
            ],
            [
                'name' => 'Shaxnoza Alimova',
                'phone' => '+998974445566',
                'course_id' => $courses[3]->id, // Matematika
                'source' => Lead::SOURCE_FRIEND,
                'status' => Lead::STATUS_ENROLLED,
                'notes' => "To'lov qildi va guruhga qo'shildi.",
            ],
            [
                'name' => 'Akmal Vohidov',
                'phone' => '+998975556677',
                'course_id' => $courses[1]->id,
                'source' => Lead::SOURCE_OTHER,
                'status' => Lead::STATUS_LOST,
                'notes' => "Boshqa hududga ko'chib ketganligi sababli rad etdi.",
            ],
        ];

        foreach ($leadsData as $ld) {
            $lead = Lead::findOne(['phone' => $ld['phone']]) ?? new Lead();
            $lead->attributes = $ld;
            $lead->assigned_to = $superAdmin ? $superAdmin->id : 1;
            $lead->save(false);

            // Faoliyat yozish
            $act = new LeadActivity();
            $act->lead_id = $lead->id;
            $act->action = LeadActivity::ACTION_NOTE;
            $act->note = "Yangi lid ro'yxatga olindi";
            $act->created_by = $superAdmin ? $superAdmin->id : 1;
            $act->save(false);
        }
        $this->stdout("✅ " . count($leadsData) . " ta CRM lidi va faoliyatlari kiritildi.\n");

        // 10. E'lonlar (Announcements)
        $announcementsData = [
            [
                'title' => 'Navro\'z bayrami munosabati bilan dam olish kunlari',
                'content' => 'Hurmatli o\'quvchilar va o\'qituvchilar! 21-23 mart kunlari markazimizda bayram munosabati bilan darslar bo\'lmaydi. Darslar 24-martdan odatiy jadval bo\'yicha davom etadi.',
                'target_type' => Announcement::TARGET_ALL,
                'published_at' => time(),
            ],
            [
                'title' => 'Shanba kuni Speaking Club: "Modern AI & Future Careers"',
                'content' => 'Barcha General English va IELTS guruhlari o\'quvchilari uchun maxsus bepul Speaking Club 201-xonada soat 16:00 da bo\'lib o\'tadi. Mehmon spiker: Jahongir Po\'latov.',
                'target_type' => Announcement::TARGET_ALL,
                'published_at' => time() - 86400,
            ],
        ];

        foreach ($announcementsData as $an) {
            $announcement = Announcement::findOne(['title' => $an['title']]) ?? new Announcement();
            $announcement->attributes = $an;
            $announcement->author_id = $superAdmin ? $superAdmin->id : 1;
            $announcement->save(false);
        }
        $this->stdout("✅ " . count($announcementsData) . " ta e'lon chop etildi.\n");

        // 11. Bildirishnomalar (Notifications)
        if ($superAdmin) {
            $notifs = [
                ['title' => "Yangi ariza kelib tushdi", 'body' => "Rustam Sharipov IELTS kursi uchun ariza qoldirdi.", 'type' => Notification::TYPE_ANNOUNCEMENT],
                ['title' => "To'lov qabul qilindi", 'body' => "Ali Valiyev 700,000 so'm to'lov qildi.", 'type' => Notification::TYPE_PAYMENT],
                ['title' => "Davomat to'ldirildi", 'body' => "IELTS Rocket-12 guruhi bo'yicha bugungi davomat olindi.", 'type' => Notification::TYPE_ATTENDANCE],
            ];
            foreach ($notifs as $n) {
                $notif = new Notification();
                $notif->user_id = $superAdmin->id;
                $notif->title = $n['title'];
                $notif->body = $n['body'];
                $notif->type = $n['type'];
                $notif->is_read = false;
                $notif->save(false);
            }
            $this->stdout("✅ Super admin uchun bildirishnomalar tayyor.\n");
        }

        // 12. Sertifikatlar (Certificates)
        if (count($students) > 0 && count($groups) > 0) {
            $certStudent = $students[0];
            $certGroup = $groups[0];
            $cert = Certificate::findOne(['student_id' => $certStudent->id, 'group_id' => $certGroup->id]) ?? new Certificate();
            $cert->student_id = $certStudent->id;
            $cert->group_id = $certGroup->id;
            $cert->cert_number = 'CERT-2026-8941';
            $cert->final_score = 8.5;
            $cert->issued_at = date('Y-m-d');
            $cert->save(false);
            $this->stdout("✅ 1 ta namunaviy sertifikat yaratildi (CERT-2026-8941).\n");
        }

        $this->stdout("🎉 Barcha ma'lumotlar to'liq yangilandi!\n");
        return ExitCode::OK;
    }
}
