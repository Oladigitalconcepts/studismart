import { supabase } from "@/integrations/supabase/client";

export interface Semester {
  id: string;
  user_id: string;
  title: string;
  level: string | null;
  term: string | null;
  start_date: string | null;
  weeks: number;
  created_at: string;
  updated_at: string;
}

export interface SemesterCourse {
  id: string;
  user_id: string;
  semester_id: string;
  title: string;
  code: string | null;
  credit_units: number;
  notebook_id: string | null;
  material_ids: string[];
  completed_weeks: number[];
  created_at: string;
  updated_at: string;
}

export interface RoadmapWeek {
  week: number;
  title: string;
  focus?: string;
  topics?: string[];
  activities?: string[];
  est_minutes?: number;
}

export interface CourseRoadmap {
  id: string;
  course_id: string;
  overview: string;
  prerequisites: string[];
  weeks: RoadmapWeek[];
  exam_tips: string[];
  generated_at: string;
}

export const LEVELS = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level"];
export const TERMS = ["First Semester", "Second Semester"];

export async function listSemesters(): Promise<Semester[]> {
  const { data, error } = await supabase
    .from("semesters")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Semester[];
}

export async function createSemester(input: {
  title: string;
  level?: string | null;
  term?: string | null;
  start_date?: string | null;
  weeks?: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("semesters")
    .insert({
      user_id: user.id,
      title: input.title,
      level: input.level ?? null,
      term: input.term ?? null,
      start_date: input.start_date ?? null,
      weeks: input.weeks ?? 12,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Semester;
}

export async function deleteSemester(id: string) {
  const { error } = await supabase.from("semesters").delete().eq("id", id);
  if (error) throw error;
}

export async function getSemester(id: string) {
  const { data, error } = await supabase.from("semesters").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Semester | null;
}

export async function listCourses(semesterId: string): Promise<SemesterCourse[]> {
  const { data, error } = await supabase
    .from("semester_courses")
    .select("*")
    .eq("semester_id", semesterId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as SemesterCourse[];
}

export async function getCourse(id: string) {
  const { data, error } = await supabase
    .from("semester_courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as SemesterCourse | null;
}

export async function addCourse(input: {
  semester_id: string;
  title: string;
  code?: string | null;
  credit_units?: number;
  notebook_id?: string | null;
  material_ids?: string[];
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("semester_courses")
    .insert({
      user_id: user.id,
      semester_id: input.semester_id,
      title: input.title,
      code: input.code ?? null,
      credit_units: input.credit_units ?? 3,
      notebook_id: input.notebook_id ?? null,
      material_ids: input.material_ids ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as SemesterCourse;
}

export async function updateCourse(id: string, patch: Partial<Pick<SemesterCourse, "title" | "code" | "credit_units" | "notebook_id" | "material_ids" | "completed_weeks">>) {
  const { error } = await supabase.from("semester_courses").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteCourse(id: string) {
  const { error } = await supabase.from("semester_courses").delete().eq("id", id);
  if (error) throw error;
}

export async function getRoadmap(courseId: string): Promise<CourseRoadmap | null> {
  const { data, error } = await supabase
    .from("course_roadmaps")
    .select("*")
    .eq("course_id", courseId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as CourseRoadmap) ?? null;
}

export async function generateRoadmap(courseId: string): Promise<CourseRoadmap> {
  const { data, error } = await supabase.functions.invoke("generate-course-roadmap", {
    body: { course_id: courseId },
  });
  if (error) throw new Error(error.message ?? "Couldn't generate roadmap");
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).roadmap as CourseRoadmap;
}

export async function listRoadmapProgress(semesterId: string) {
  const courses = await listCourses(semesterId);
  const ids = courses.map((c) => c.id);
  if (!ids.length) return { courses, roadmaps: {} as Record<string, { weeks: number }> };
  const { data } = await supabase.from("course_roadmaps").select("course_id, weeks").in("course_id", ids);
  const roadmaps: Record<string, { weeks: number }> = {};
  (data ?? []).forEach((r: any) => {
    roadmaps[r.course_id] = { weeks: Array.isArray(r.weeks) ? r.weeks.length : 0 };
  });
  return { courses, roadmaps };
}
