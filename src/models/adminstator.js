const { DataTypes, where } = require('sequelize')
const bcrypt = require('bcryptjs')
const sequelize = require('../db/sequelize')

const Admin = sequelize.define('adminstator',{
    admin_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    email:{
        type: DataTypes.STRING(45),
        allowNull:false,
        unique:'email_UNIQUE'
    },
    password:{
        type: DataTypes.STRING(100),
        allowNull:false
    }
})

const AdminToken = sequelize.define('adminstator_token',{
    token:{
        type: DataTypes.STRING(200),
        allowNull:false,
        unique:'token_UNIQUE'
    },
    admin_id:{
        type: DataTypes.INTEGER,
        references: Admin,
        key:'admin_id'
    }
})

AdminToken.removeAttribute("id")

Admin.verifyLogin = async function (email,password){
    
    const adminResult = await Admin.findOne({where:{email}});

            if(!adminResult){
                throw new Error('Unable to login');
            }

            const isMatch = await bcrypt.compare(password,adminResult.password);
            if(!isMatch){
                throw new Error('Unable to login');
            }

            return adminResult;
}

module.exports = {Admin,AdminToken}