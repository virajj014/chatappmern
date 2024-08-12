const User = require('../models/userModel');

const updateUserStatus = async (userId, isOnline) => {
    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { isOnline: isOnline },
            { new: true }
        );

        // console.log('user status updates ', user)

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    } catch (error) {
        console.error('Error updating user status:', error);
        throw error;
    }
};

const checkIfUserIsOnline = async (userId) => {
    console.log('Checking if user online ')


    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // console.log(user.isOnline)
        if(user.isOnline == true){
            // console.log('other user is online ')
            return true
        };

        return false;
    } catch (error) {
        console.error('Error checking user online status:', error);
        throw error;
    }
};

module.exports = {
    updateUserStatus,
    checkIfUserIsOnline,
};