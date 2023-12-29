const Section = require("../models/Section")
const Course = require("../models/Course")

exports.createSection = async(req,res) => {
    try{
        //data fetch
        const{sectionName, courseId} = req.body;

        //data validation
        if(!sectionName || !courseId){
            return res.status(400).json({
                success:false,
                message:"Missing data , All fields are Required"
            })
        }
        //create section
        const newSection = await Section.create({sectionName});

        //update course with section objectId
        const updatedCourseDetails = await Course.findByIdAndUpdate(courseId,
                                                            {
                                                                $push:{
                                                                    courseContent:newSection._id,
                                                                }
                                                            },
                                                            {new:true},
                                                        )
                                                        .populate({
                                                            path: "courseContent",
                                                            populate: {
                                                                path: "subSection",
                                                            },
                                                        })
                                                        .exec();
        //Hw: use populate to replace section and subsections both in the updatedCourseDetails 
        //return response
        return res.status(200).json({
            success:true,
            message:'Section created successfully',
            updatedCourseDetails 
        })

    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to create section , please try again',
            error:error.message
        })
    }
}
//update a section
exports.updateSection = async(req,res) =>{
    try{
        //data input
        const {sectionName, sectionId} = req.body

        //data validation
        if(!sectionName || !sectionId){
            return res.status(400).json({
                success:false,
                message:"Missing data , All fields are Required"
            })
        }

        //update data
        const section = await Section.findByIdAndUpdate(sectionId, {sectionName}, {new:true});
        //return response
        return res.status(200).json({
            success:true,
            message:"Section updated successfully"
        });
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to update section , please try again',
            error:error.message
        })
    }
}
//delete a section
exports.deleteSection = async(req,res) => {
    try{
        //getId - assuming that we are sending ID in params
        const {sectionId} = req.params

        //findByIdAndDelete
        await Section.findByIdAndDelete(sectionId);
        //TODO[Testing]: do we need to delete the delete the entry from the course schema??
        //return response
        return res.status(200).json({
            success:true,
            message:"Section Deleted successfully"
        })
    }
    catch(error){
        return res.status(500).json({
            success:false,
            message:'Unable to delete section , please try again',
            error:error.message
        })
    }
}