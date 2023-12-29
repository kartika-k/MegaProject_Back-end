const User = require("../models/User");
const OTP = require("../models/OTP");
const otpGenerator = require("otp-generator");
const mailSender = require("../utils/mailSender");
const { passwordUpdated } = require("../mail/templates/passwordUpdate");
const Profile = require("../models/Profile");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//send OTP
exports.sendOTP = async(req,res) => {

    try{
        
        //fetch eamil from request ki body
        const {email} = req.body;

        //check if user already exist
        const checkUserPresent = await User.findOne({email});

        //if user already exist, then return response
        if(checkUserPresent) {
            return res.status(401).json({
                success:false,
                message:'User already registered'
            })
        }

        //generate otp
        var otp = otpGenerator.generate(6,{
            upperCaseAlphabets:false,
            lowerCaseAlphabets:false,
            specialChars:false,
        });

        console.log("OTP Generated: ", otp);

        //check unique otp or not
        let result = await OTP.findOne({otp: otp});

        //If not unique generate new otp
        while(result){
            OTP = otpGenerator.generate(6,{
                upperCaseAlphabets:false,
                lowerCaseAlphabets:false,
                specialChars:false,
            });
            result = await OTP.findOne({otp: otp});
        }

        //Entry of OTP in database
        const otpPayload = {email, otp};

        //create an entry for OTP
        const otpBody = await OTP.create(otpPayload);
        console.log(otpBody);

        //return response successfully
        res.status(200).json({
            success:true,
            message:'OTP Sent Successfully',
            otp,
        })

    }

    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:error.message,
        })
    }

};

// Signup Controller for Registering USers
exports.signUp = async (req,res) => {
    try{
        //data fetch krlo from request ki body
        const { firstName, lastName, email, password,
                confirmPassword, accountType,
                contactNumber, otp } = req.body;

        //validate krlo
        if(!firstName || !lastName || !email || !password || !confirmPassword || !otp){
            return res.status(403).json({
                success:false,
                message:"All fields are required",
            })
        }

        //2 password match krlo
        if(password !== confirmPassword){
            return res.status(400).json({
                success:false,
                message:'Password and ConfirmPassword value does not match, please try again'
            });
        }
        //check user already exist or not
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({
                success:false,
                message:'User is already registered',
            });
        }

        //find most recent otp stored for the user
        const recentOtp = await OTP.find({email}).sort({createdAt:-1}).limit(1);
        console.log(recentOtp);

        //validate otp
        if(recentOtp.length == 0){
            //OTP not found
            return res.status(400).json({
                success:false,
                message:'OTP not found'
            })
        } else if(otp !== recentOtp.otp){
            //Invalid otp
            return res.status(400).json({
                success:false,
                message:"Invalid OTP",
            });
        }

        //Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        //entry create in DB

        const profileDetails = await Profile.create({
            gender: null,
            dateOfBirth: null,
            about:null,
            contactNumber: null,
        })
        const user = await User.create({
            firstName, lastName, email, contactNumber,
            password:hashedPassword,
            accountType,
            additionalDetails:profileDetails._id,
            image:`https://api.dicebear.com/5.x/initials/svg?seed=${firstname} ${lastname}`,

        })
       
        //return response
        return res.status(200).json({
            success:true,
            message:'User is registered Successfully',
            user,
        });

    }
    catch(error){
        console.log(error);
        return res.status(500).json({
            success:false,
            message:"User cannot be registered, Please try again"
        })
    }
}

// Login controller for authenticating users
exports.login = async (req,res) => {
    try{
        //get data from req body
        const {email, password} = req.body;

        //validation data
        if(!email || !password){
            return res.status(403).json({
                success:false,
                message:'All fields are required , Please try again',

            });
        }
        //check user exist or not
        const user = await User.findOne({email}).populate("additionalDetails");
        if(!user){
            return res.status(401).json({
                success:false,
                message:"User is not registered, please signup first",

            });
        }
        //generate JWT, after password matching
        if(await bcrypt.compare(password, user.password)){

            const payload ={
                email:user.email,
                id: user._id,
                accountType:user.accountType,
            }

            const token = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn:"2h",
            });
            // Save token to user document in database
            user.token = token;
            user.password = undefined;
            // Set cookie for token and return success response
            const options = {
                expires : new Date(Date.now() + 3*24*60*60*1000),
                httpOnly: true,
            }
            res.cookie("token", token, options).status(200).json({
                success:true,
                token,
                user,
                messagse:"Logged in successfully",
            })
        }
        else{
            return res.status(401).json({
                success:false,
                message:"Password Incorrect",
            })
        }
        
    }
    catch(error){
        console.log(error);
        // Return 500 Internal Server Error status code with error message
        return res.status(500).json({
            success:false,
            message:"Login failure, please try again",
        })
    }
};

// Controller for Changing Password
exports.changePassword = async (req, res) => {
	try {
		// Get user data from req.user
		const userDetails = await User.findById(req.user.id);

		// Get old password, new password, and confirm new password from req.body
		const { oldPassword, newPassword, confirmNewPassword } = req.body;

		// Validate old password
		const isPasswordMatch = await bcrypt.compare(
			oldPassword,
			userDetails.password
		);
		if (!isPasswordMatch) {
			// If old password does not match, return a 401 (Unauthorized) error
			return res
				.status(401)
				.json({ success: false, message: "The password is incorrect" });
		}

		// Match new password and confirm new password
		if (newPassword !== confirmNewPassword) {
			// If new password and confirm new password do not match, return a 400 (Bad Request) error
			return res.status(400).json({
				success: false,
				message: "The password and confirm password does not match",
			});
		}

		// Update password
		const encryptedPassword = await bcrypt.hash(newPassword, 10);
		const updatedUserDetails = await User.findByIdAndUpdate(
			req.user.id,
			{ password: encryptedPassword },
			{ new: true }
		);

		// Send notification email
		try {
			const emailResponse = await mailSender(
				updatedUserDetails.email,
				passwordUpdated(
					updatedUserDetails.email,
					`Password updated successfully for ${updatedUserDetails.firstName} ${updatedUserDetails.lastName}`
				)
			);
			console.log("Email sent successfully:", emailResponse.response);
		} catch (error) {
			// If there's an error sending the email, log the error and return a 500 (Internal Server Error) error
			console.error("Error occurred while sending email:", error);
			return res.status(500).json({
				success: false,
				message: "Error occurred while sending email",
				error: error.message,
			});
		}

		// Return success response
		return res
			.status(200)
			.json({ success: true, message: "Password updated successfully" });
	} catch (error) {
		// If there's an error updating the password, log the error and return a 500 (Internal Server Error) error
		console.error("Error occurred while updating password:", error);
		return res.status(500).json({
			success: false,
			message: "Error occurred while updating password",
			error: error.message,
		});
	}
};
