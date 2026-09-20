<?php

use yii\db\Migration;

/**
 * Migration: To'lovlar, moliya, lead (CRM), e'lonlar, sertifikatlar
 */
class m260918_000004_create_payments_crm_tables extends Migration
{
    public function safeUp()
    {
        // ─── To'lov rejalari ────────────────────────────────────────
        $this->createTable('{{%payment_plans}}', [
            'id'          => $this->primaryKey(),
            'student_id'  => $this->integer()->notNull(),
            'group_id'    => $this->integer()->notNull(),
            'month'       => $this->string(7)->notNull()->comment('YYYY-MM'),
            'amount'      => $this->integer()->notNull()->comment('UZS'),
            'paid_amount' => $this->integer()->notNull()->defaultValue(0),
            'due_date'    => $this->date()->notNull(),
            'status'      => $this->string(20)->notNull()->defaultValue('pending')
                                  ->comment('pending|partial|paid|overdue|cancelled'),
            'created_at'  => $this->integer()->notNull(),
            'updated_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_pp_student', '{{%payment_plans}}', 'student_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_pp_group',   '{{%payment_plans}}', 'group_id',   '{{%groups}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_pp_unique', '{{%payment_plans}}', ['student_id', 'group_id', 'month'], true);
        $this->createIndex('idx_pp_status', '{{%payment_plans}}', 'status');

        // ─── To'lovlar ──────────────────────────────────────────────
        $this->createTable('{{%payments}}', [
            'id'          => $this->primaryKey(),
            'plan_id'     => $this->integer()->notNull(),
            'amount'      => $this->integer()->notNull(),
            'method'      => $this->string(20)->notNull()->defaultValue('cash')
                                  ->comment('cash|card|click|payme|bank|other'),
            'received_by' => $this->integer()->null()->comment('reception user_id'),
            'paid_at'     => $this->dateTime()->notNull(),
            'note'        => $this->string(500)->null(),
            'created_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_pay_plan', '{{%payments}}', 'plan_id', '{{%payment_plans}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_pay_paid_at', '{{%payments}}', 'paid_at');

        // ─── Xarajatlar ─────────────────────────────────────────────
        $this->createTable('{{%expenses}}', [
            'id'          => $this->primaryKey(),
            'category'    => $this->string(50)->notNull()
                                  ->comment('rent|salary|ads|internet|other'),
            'amount'      => $this->integer()->notNull(),
            'description' => $this->string(500)->null(),
            'date'        => $this->date()->notNull(),
            'center_id'   => $this->integer()->null(),
            'created_by'  => $this->integer()->notNull(),
            'created_at'  => $this->integer()->notNull(),
        ]);

        // ─── Teacher ish haqi ───────────────────────────────────────
        $this->createTable('{{%teacher_salaries}}', [
            'id'            => $this->primaryKey(),
            'teacher_id'    => $this->integer()->notNull(),
            'month'         => $this->string(7)->notNull()->comment('YYYY-MM'),
            'type'          => $this->string(20)->notNull()->defaultValue('fixed')
                                    ->comment('fixed|per_lesson|percentage'),
            'lessons_count' => $this->smallInteger()->null(),
            'rate'          => $this->integer()->null()->comment('per lesson UZS yoki %'),
            'amount'        => $this->integer()->notNull()->comment('Jami hisoblangan'),
            'paid_amount'   => $this->integer()->notNull()->defaultValue(0),
            'status'        => $this->string(20)->notNull()->defaultValue('pending')
                                    ->comment('pending|paid|partial'),
            'paid_at'       => $this->dateTime()->null(),
            'created_at'    => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_salary_teacher', '{{%teacher_salaries}}', 'teacher_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');

        // ─── Leadlar (CRM) ──────────────────────────────────────────
        $this->createTable('{{%leads}}', [
            'id'          => $this->primaryKey(),
            'name'        => $this->string(100)->notNull(),
            'phone'       => $this->string(20)->notNull(),
            'course_id'   => $this->integer()->null(),
            'source'      => $this->string(50)->null()
                                  ->comment('instagram|telegram|website|friend|other'),
            'status'      => $this->string(20)->notNull()->defaultValue('new')
                                  ->comment('new|contacted|trial|enrolled|lost'),
            'notes'       => $this->text()->null(),
            'assigned_to' => $this->integer()->null(),
            'center_id'   => $this->integer()->null(),
            'converted_at'=> $this->integer()->null(),
            'created_at'  => $this->integer()->notNull(),
            'updated_at'  => $this->integer()->notNull(),
        ]);

        $this->createTable('{{%lead_activities}}', [
            'id'         => $this->primaryKey(),
            'lead_id'    => $this->integer()->notNull(),
            'action'     => $this->string(50)->notNull(),
            'note'       => $this->text()->null(),
            'created_by' => $this->integer()->null(),
            'created_at' => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_la_lead', '{{%lead_activities}}', 'lead_id', '{{%leads}}', 'id', 'CASCADE', 'CASCADE');

        // ─── E'lonlar ────────────────────────────────────────────────
        $this->createTable('{{%announcements}}', [
            'id'           => $this->primaryKey(),
            'author_id'    => $this->integer()->notNull(),
            'target_type'  => $this->string(20)->notNull()->defaultValue('all')
                                   ->comment('all|group|student'),
            'target_id'    => $this->integer()->null()->comment('group_id yoki student_id'),
            'title'        => $this->string(200)->notNull(),
            'content'      => $this->text()->notNull(),
            'center_id'    => $this->integer()->null(),
            'published_at' => $this->integer()->notNull(),
            'created_at'   => $this->integer()->notNull(),
        ]);

        // ─── Notificationlar ────────────────────────────────────────
        $this->createTable('{{%notifications}}', [
            'id'         => $this->primaryKey(),
            'user_id'    => $this->integer()->notNull(),
            'title'      => $this->string(200)->notNull(),
            'body'       => $this->text()->null(),
            'type'       => $this->string(30)->null()
                                 ->comment('payment|attendance|grade|homework|announcement|exam'),
            'data_json'  => $this->text()->null()->comment('Extra JSON payload'),
            'is_read'    => $this->boolean()->notNull()->defaultValue(false),
            'created_at' => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_notif_user', '{{%notifications}}', 'user_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->createIndex('idx_notif_user_read', '{{%notifications}}', ['user_id', 'is_read']);

        // ─── Sertifikatlar ───────────────────────────────────────────
        $this->createTable('{{%certificates}}', [
            'id'          => $this->primaryKey(),
            'student_id'  => $this->integer()->notNull(),
            'group_id'    => $this->integer()->notNull(),
            'cert_number' => $this->string(50)->notNull()->unique(),
            'final_score' => $this->float()->null(),
            'issued_at'   => $this->date()->notNull(),
            'pdf_url'     => $this->string(500)->null(),
            'created_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_cert_student', '{{%certificates}}', 'student_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');
        $this->addForeignKey('fk_cert_group',   '{{%certificates}}', 'group_id',   '{{%groups}}', 'id', 'CASCADE', 'CASCADE');

        // ─── Hujjatlar ───────────────────────────────────────────────
        $this->createTable('{{%student_documents}}', [
            'id'          => $this->primaryKey(),
            'student_id'  => $this->integer()->notNull(),
            'type'        => $this->string(30)->notNull()
                                  ->comment('passport|contract|certificate|payment_agreement|other'),
            'title'       => $this->string(200)->notNull(),
            'file_url'    => $this->string(500)->notNull(),
            'created_at'  => $this->integer()->notNull(),
        ]);

        $this->addForeignKey('fk_doc_student', '{{%student_documents}}', 'student_id', '{{%users}}', 'id', 'CASCADE', 'CASCADE');
    }

    public function safeDown()
    {
        $this->dropTable('{{%student_documents}}');
        $this->dropTable('{{%certificates}}');
        $this->dropTable('{{%notifications}}');
        $this->dropTable('{{%announcements}}');
        $this->dropTable('{{%lead_activities}}');
        $this->dropTable('{{%leads}}');
        $this->dropTable('{{%teacher_salaries}}');
        $this->dropTable('{{%expenses}}');
        $this->dropTable('{{%payments}}');
        $this->dropTable('{{%payment_plans}}');
    }
}
