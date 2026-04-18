import express from "express";
import { 
  getAllCourses, 
  getCourseById, 
  addNewCourse, 
  updateCourse, 
  deleteCourse,
  getRecommendedBooksForCourse
} from "../database/course.js";

const router = express.Router();

// GET all courses
router.get("/", async (req, res) => {
  try {
    const courses = await getAllCourses();
    res.status(200).json(courses);
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ error: "Failed to retrieve courses" });
  }
});

// GET specific course
router.get("/:id", async (req, res) => {
  try {
    const course = await getCourseById(req.params.id);
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.status(200).json(course);
  } catch (error) {
    console.error(`Error fetching course ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to retrieve course" });
  }
});

// POST new course
router.post("/", async (req, res) => {
  try {
    const { coursename, coursesubjects } = req.body;
    if (!coursename) {
      return res.status(400).json({ error: "coursename is strictly required" });
    }
    const newCourse = await addNewCourse(coursename, coursesubjects || "");
    res.status(201).json(newCourse);
  } catch (error) {
    console.error("Error creating course:", error);
    res.status(500).json({ error: "Failed to create course" });
  }
});

// PUT (update) course
router.put("/:id", async (req, res) => {
  try {
    const { coursename, coursesubjects } = req.body;
    if (!coursename) {
      return res.status(400).json({ error: "coursename is strictly required" });
    }
    const updatedCourse = await updateCourse(req.params.id, coursename, coursesubjects || "");
    res.status(200).json(updatedCourse);
  } catch (error) {
    console.error(`Error updating course ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to update course" });
  }
});

// DELETE course
router.delete("/:id", async (req, res) => {
  try {
    await deleteCourse(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting course ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to delete course" });
  }
});

// GET recommended books explicitly matching a specific Course's subjects!
router.get("/:id/books", async (req, res) => {
  try {
    const books = await getRecommendedBooksForCourse(req.params.id);
    res.status(200).json(books);
  } catch (error) {
    console.error(`Error fetching recommended books for course ${req.params.id}:`, error);
    res.status(500).json({ error: "Failed to fetch recommended books" });
  }
});

export default router;
