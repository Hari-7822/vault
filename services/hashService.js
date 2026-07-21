import bcrypt from "bcrypt";

exports.hashPassword = async (plainPassword) => {return await bcrypt.hash(plainPassword, 10)};

exports.comparePassword = async(plainpassword, hashedPassword) => {return await bcrypt.compare(plainPassword, hashedPassword)};