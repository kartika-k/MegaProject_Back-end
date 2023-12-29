const Course = require("../models/Course");
const Category = require("../models/Category");
const User = require("../models/User");
const {uploadImageToCloudinary} = require("../utils/imageUploader");

//createCourse ka Handler function
exports.createCourse = async(req, res) => {
    try{

        //fetch data
        const{courseName, courseDescription, whatYouWillLearn, price, tag, category} = req.body;

        //get thumbnail
        const thumbnail = req.files.thumbnailImage;
    
        //validation
        if(!courseName || !courseDescription || !whatYouWillLearn || !price || !category || !thumbnail){
            return res.status(400).json({
                success:false,
                message: "All fields are required",
            });
        }
        //check for instructor validation
        const userId = req.user.id;
        const instructorDetails = await User.findById(userId);
        console.log("Instructor Details: ", instructorDetails);
        //TODO: verify that userId and instructorDetails._id are same or different?

        if(!instructorDetails){
            return res.status(404).json({
                success:false,
                message:"Instructor Details not found",
            })
        }

        //check given tag is valid or not
        const categoryDetails = await Category.findById(category);
		if (!categoryDetails) {
			return res.status(404).json({
				success: false,
				message: "Category Details Not Found",
			});
		}

        //upload image to cloudinary
        const thumbnailImage = await uploadImageToCloudinary(thumbnail, process.env.FOLDER_NAME);

        //create an entry  for new course
        const newCourse = await Course.create({
            courseName,
            courseDescription,
            instructor: instructorDetails._id,
            whatYouWillLearn: whatYouWillLearn,
            price,
            category: categoryDetails._id,
            thumbnail: thumbnailImage.secure_url,
        })
        //new course created

        //add the new course to the user schema of instructor
        await User.findByIdAndUpdate(
            {_id: instructorDetails._id},

            {
                $push: {
                    courses: newCourse._id
                }
            },
            {new:true},
        );

        //update tag schema 
        //hw
        // Add the new course to the Categories
		await Category.findByIdAndUpdate(
			{ _id: category },
			{
				$push: {
					course: newCourse._id,
				},
			},
			{ new: true }
		);

        //return response
        // Return the new course and a success message
        return res.status(200).json({
            success:true,
            message:"Course Created Successfully",
            data:newCourse,
        });

    }
    catch(error){
        	// Handle any errors that occur during the creation of the course
        console.error(error);
        return res.status(500).json({
            success:false,
            message:"Failed to create course",
            error:error.message,
        })
    }
}

//getAllCourses ka handler function
exports.showAllCourses = async(req,res) => {
    try{
        const allCourses = await Course.find({},{courseName:true,
                                                price:true,
                                                thumbnail:true,
                                                instructor:true,
                                                ratingAndReviews:true,
                                                studentsEnrolled:true,})
                                                .populate("instructor")
                                                .exec();
        return res.status(200).json({
            success:true,
            message:'Data for all courses fetched successfully',
            data:allCourses,
        })
    }
    catch(error){
        console.error(error);
        return res.status(500).json({
            success:false,
            message:"Cannot fetch course data",
            error:error.message,
        })
    }
}

//getCourseDetails
exports.getCourseDetails = async(req,res) => {
    try{
        //get id
        const {courseId} = req.body;
        //find course details
        const courseDetails = await Course.find({_id:courseId})
                                                .populate(
                                                    {
                                                        path:"instructor",
                                                        populate:{
                                                            path:"additionalDetails",
                                                        },
                                                    }
                                                )
                                                .populate("category")
                                                .populate("ratingAndReviews")
                                                .populate({
                                                    path:"courseContent",
                                                    populate:{
                                                        path:"subSection",
                                                    }
                                                })
                                                .exec();
        //validation
        if(!courseDetails){
            return res.status(400).json({
                success:false,
                message:'Could not find the course with ${courseId}',
            });
        }      
        //return response
        return res.status(200).json({
            success:true,
            message:'Course Details fetched successfully',
            data:courseDetails,
        })                                  
                                                
    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message
        });
    }
}