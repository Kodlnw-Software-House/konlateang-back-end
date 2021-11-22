const { DataTypes } = require('sequelize')
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
        unique:'email_UNIQUE',
        validate:{
            isEmail:true
        }
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
        allowNull:false,
        references: Admin,
        key:'admin_id'
    }
})

AdminToken.removeAttribute("id")

Admin.verifyLogin = async function (email,password){
    
    const adminResult = await Admin.findOne({where:{email}});

            if(!adminResult){
                throw new Error('ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบชื่อผู้ใช้และรหัสผ่านอีกครั้ง');
            }

            const isMatch = await bcrypt.compare(password,adminResult.password);
            if(!isMatch){
                throw new Error('ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบชื่อผู้ใช้และรหัสผ่านอีกครั้ง');
            }

            return adminResult;
}

module.exports = {Admin,AdminToken}