/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Script này chỉ nên chạy trong môi trường development
if (process.env.NODE_ENV === "production") {
  console.log("❌ Script chỉ được chạy trong môi trường development.");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  throw new Error(
    "Supabase URL hoặc Service Role Key chưa được cấu hình trong .env.local"
  );
}

const PASSWORD = "123456";

const supabaseAdmin = createClient(supabaseUrl, serviceKey);

async function seedDatabase() {
  console.log("🚀 Bắt đầu quá trình seeding...");

  // Xóa dữ liệu cũ để tránh trùng lặp
  console.log("🗑️ Xóa dữ liệu cũ...");
  await cleanupData();

  // Tạo dữ liệu mới
  console.log("👑 Tạo admin...");
  await seedAdmin();

  console.log("🧑‍🏫 Tạo giáo viên...");
  const { teacherUsers, teachers } = await seedTeachers();

  console.log("🧑‍🎓 Tạo học sinh...");
  const students = await seedStudents();

  console.log("🎹 Tạo lớp học...");
  const classes = await seedClasses(teachers);

  console.log("🔗 Gán giáo viên và học sinh vào lớp...");
  await assignStudentsAndTeachersToClasses(students, classes, teachers);

  console.log("📈 Tạo dữ liệu thanh toán, điểm danh và chi phí...");
  await seedRelatedData(students, classes, teachers);

  console.log("✅ Quá trình seeding hoàn tất!");
}

async function cleanupData() {
  // Lấy danh sách tất cả user
  const {
    data: { users },
    error: listError,
  } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    console.error("Lỗi khi lấy danh sách user để xóa:", listError);
    return;
  }

  // Lọc ra những user có role là 'teacher' hoặc 'admin'
  const usersToDelete = users.filter(
    (user) =>
      user.app_metadata.role === "teacher" || user.app_metadata.role === "admin"
  );

  if (usersToDelete.length > 0) {
    const userIds = usersToDelete.map((u) => u.id);
    console.log(`🔍 Tìm thấy ${userIds.length} user (admin/teacher) để xóa...`);
    for (const userId of userIds) {
      const { error: deleteError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError)
        console.error(`Lỗi khi xóa user ${userId}:`, deleteError.message);
    }
    console.log(`✅ Đã xóa ${userIds.length} user khỏi auth.`);
  } else {
    console.log("ℹ️ Không tìm thấy user nào để xóa.");
  }

  // Xóa dữ liệu trong các bảng public (thứ tự quan trọng)
  const tables = [
    "expenses",
    "payment_status",
    "attendance",
    "student_class_enrollments",
    "class_teachers",
    "classes",
    "students",
    "teachers",
  ];
  for (const table of tables) {
    const { error } = await supabaseAdmin
      .from(table)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) console.error(`Lỗi khi xóa bảng ${table}:`, error.message);
  }
}

async function seedAdmin() {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: "ngonhuthuy@gmail.com",
    password: PASSWORD,
    email_confirm: true,
    app_metadata: { role: "admin" },
  });

  if (error) {
    console.error("Lỗi khi tạo admin:", error.message);
  } else {
    console.log("✅ Admin đã được tạo thành công:", data.user?.email);
  }
}

async function seedTeachers() {
  const teacherData = [
    {
      phone: "0912345678",
      password: PASSWORD,
      full_name: "Nguyễn Văn An",
      salary_per_session: 300000.0,
      notes: "Chuyên dạy piano cổ điển.",
    },
    {
      phone: "0987654321",
      password: PASSWORD,
      full_name: "Trần Thị Bình",
      salary_per_session: 320000.0,
      notes: "Có kinh nghiệm dạy trẻ em.",
    },
  ];

  const teacherUsers = [];
  const teachers = [];

  for (const data of teacherData) {
    const phoneE164 = data.phone.startsWith("0")
      ? "+84" + data.phone.substring(1)
      : data.phone;

    // Tạo user trong auth.users
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        phone: phoneE164,
        password: data.password,
        phone_confirm: true,
        app_metadata: { role: "teacher" },
      });

    if (authError) {
      console.error(
        `Lỗi khi tạo user cho ${data.full_name}:`,
        authError.message
      );
      continue;
    }
    teacherUsers.push(authData.user);

    // Tạo record trong public.teachers
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .insert({
        id: authData.user.id,
        full_name: data.full_name,
        phone: data.phone, // Lưu SĐT gốc dạng 09...
        salary_per_session: data.salary_per_session,
        notes: data.notes,
      })
      .select()
      .single();

    if (teacherError) {
      console.error(
        `Lỗi khi tạo teacher record cho ${data.full_name}:`,
        teacherError.message
      );
    } else {
      teachers.push(teacher);
    }
  }

  return { teacherUsers, teachers };
}

async function seedStudents() {
  const studentData = [
    {
      full_name: "Lê Minh Khang",
      phone: "0331112222",
      parent_phone: "0901112222",
    },
    {
      full_name: "Phạm Thị Diệu",
      phone: "0332223333",
      parent_phone: "0902223333",
    },
    {
      full_name: "Võ Hoàng Long",
      phone: "0334445555",
      parent_phone: "0904445555",
    },
    {
      full_name: "Đặng Mai Anh",
      phone: "0336667777",
      parent_phone: "0906667777",
    },
    {
      full_name: "Bùi Gia Hân",
      phone: "0338889999",
      parent_phone: "0908889999",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("students")
    .insert(studentData)
    .select();
  if (error) console.error("Lỗi khi tạo học sinh:", error.message);
  return data || [];
}

async function seedClasses(teachers: any[]) {
  const classData = [
    {
      name: "Piano Vỡ Lòng A",
      days_of_week: JSON.stringify([
        { day: 1, start_time: "17:00" },
        { day: 3, start_time: "17:00" },
      ]), // T2, T4
      duration_minutes: 60,
      monthly_fee: 1200000.0,
      salary_per_session: teachers[0]?.salary_per_session || 300000.0,
      start_date: "2025-01-06",
      end_date: "2025-12-29",
    },
    {
      name: "Piano Nâng Cao B",
      days_of_week: JSON.stringify([
        { day: 2, start_time: "18:00" },
        { day: 4, start_time: "18:00" },
      ]), // T3, T5
      duration_minutes: 90,
      monthly_fee: 1800000.0,
      salary_per_session: teachers[1]?.salary_per_session || 320000.0,
      start_date: "2025-01-07",
      end_date: "2025-12-30",
    },
    {
      name: "Piano Cuối Tuần C",
      days_of_week: JSON.stringify([{ day: 6, start_time: "09:00" }]), // T7
      duration_minutes: 120,
      monthly_fee: 1500000.0,
      salary_per_session: teachers[0]?.salary_per_session || 300000.0,
      start_date: "2025-01-11",
      end_date: "2025-12-27",
    },
  ];

  const { data, error } = await supabaseAdmin
    .from("classes")
    .insert(classData)
    .select();
  if (error) console.error("Lỗi khi tạo lớp học:", error.message);
  return data || [];
}

async function assignStudentsAndTeachersToClasses(
  students: any[],
  classes: string | any[],
  teachers: string | any[]
) {
  if (!teachers || teachers.length === 0 || !classes || classes.length === 0) {
    console.error(
      "❌ Không thể gán vì không có giáo viên hoặc lớp học. Dừng quá trình seeding."
    );
    return;
  }

  // Gán giáo viên cho lớp
  const classTeachersData = [
    { class_id: classes[0].id, teacher_id: teachers[0].id },
    { class_id: classes[1].id, teacher_id: teachers[1].id },
    { class_id: classes[2].id, teacher_id: teachers[0].id },
  ];
  await supabaseAdmin.from("class_teachers").insert(classTeachersData);

  // Gán học sinh vào lớp
  const enrollmentsData = [
    {
      student_id: students[0].id,
      class_id: classes[0].id,
      enrollment_date: "2025-01-06",
      status: "active",
    },
    {
      student_id: students[1].id,
      class_id: classes[0].id,
      enrollment_date: "2025-01-06",
      status: "active",
    },
    {
      student_id: students[2].id,
      class_id: classes[1].id,
      enrollment_date: "2025-01-07",
      status: "active",
    },
    {
      student_id: students[3].id,
      class_id: classes[1].id,
      enrollment_date: "2025-01-07",
      status: "trial",
    },
    {
      student_id: students[4].id,
      class_id: classes[2].id,
      enrollment_date: "2025-01-11",
      status: "active",
    },
  ];
  await supabaseAdmin.from("student_class_enrollments").insert(enrollmentsData);
}

async function seedRelatedData(
  students: any[],
  classes: any[],
  teachers: any[]
) {
  // Thêm dữ liệu điểm danh
  const attendanceData = [
    // Lớp A - Học sinh 0 - Có mặt
    {
      class_id: classes[0].id,
      student_id: students[0].id,
      attendance_date: "2025-10-27",
      is_present: true,
      marked_by: "teacher",
    },
    // Lớp B - Học sinh 2 - Vắng
    {
      class_id: classes[1].id,
      student_id: students[2].id,
      attendance_date: "2025-10-28",
      is_present: false,
      marked_by: "teacher",
    },
    // Điểm danh giáo viên
    {
      class_id: classes[0].id,
      teacher_id: teachers[0].id,
      attendance_date: "2025-10-27",
      is_present: true,
      marked_by: "admin",
    },
  ];
  await supabaseAdmin.from("attendance").insert(attendanceData);

  // Thêm dữ liệu học phí
  const paymentData = [
    // Học sinh 0 - Lớp A - Tháng 10 - Đã đóng
    {
      student_id: students[0].id,
      class_id: classes[0].id,
      month: 10,
      year: 2025,
      is_paid: true,
      paid_at: new Date().toISOString(),
    },
    // Học sinh 1 - Lớp A - Tháng 10 - Chưa đóng
    {
      student_id: students[1].id,
      class_id: classes[0].id,
      month: 10,
      year: 2025,
      is_paid: false,
    },
    // Học sinh 2 - Lớp B - Tháng 10 - Đã đóng
    {
      student_id: students[2].id,
      class_id: classes[1].id,
      month: 10,
      year: 2025,
      is_paid: true,
      paid_at: new Date().toISOString(),
    },
  ];
  await supabaseAdmin.from("payment_status").insert(paymentData);

  // Thêm dữ liệu chi phí
  const expenseData = [
    {
      amount: 5000000.0,
      reason: "Tiền thuê mặt bằng T10",
      expense_date: "2025-10-05",
      month: 10,
      year: 2025,
    },
    {
      amount: 1500000.0,
      reason: "Tiền điện nước T10",
      expense_date: "2025-10-15",
      month: 10,
      year: 2025,
    },
  ];
  await supabaseAdmin.from("expenses").insert(expenseData);
}

// Chạy hàm chính
seedDatabase().catch((error) => {
  console.error("❌ Đã xảy ra lỗi trong quá trình seeding:", error);
  process.exit(1);
});
