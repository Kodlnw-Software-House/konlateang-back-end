const {DataTypes} = require('sequelize')
const sequelize = require('../db/sequelize')
const bcrypt = require('bcryptjs')
const validator = require('validator')

const Patient = sequelize.define('patient',{
    patient_id:{
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement:true
    },
    email:{
        type: DataTypes.STRING(45),
        allowNull:false,
        unique:'email_UNIQUE',
        validate:{
            isEmail:true,
            isUnique: (value,next)=>{
                Patient.findAll({
                    where:{
                        email:value
                    },
                    attributes:['patient_id']}).then((patient)=>{
                        if (patient.length != 0)
                        next(new Error('Email address already in use!'));
                        next();
                    })
            }
        }
    },
    password:{
        type: DataTypes.STRING(100),
        allowNull:false,
        validate:{
            len: [7,14],
            notPassword(value){
                if(value.toLowerCase().includes('password')){
                    throw new Error('Password cannot contain "password" keyword')
                }
            }
        }
    },
    citizen_id:{
        type: DataTypes.BIGINT(13),
        allowNull:false,
        unique:'citizen_id_UNIQUE',
        validate:{
            isUnique: (value,next)=>{
                Patient.findAll({
                    where:{
                        citizen_id:value
                    },
                    attributes:['patient_id']}).then((patient)=>{
                        if (patient.length != 0)
                        next(new Error('ฟิลด์ citizen_id ถูกใช้ไปแล้ว !'));
                        next();
                    })
            }
        }
    },
    fname:{
        type: DataTypes.STRING(45),
        allowNull:false
    },
    lname:{
        type: DataTypes.STRING(45),
        allowNull:false
    },
    age:{
        type: DataTypes.INTEGER,
        allowNull:false
    },
    dob:{
        type: DataTypes.DATEONLY,
        allowNull: false
    },
    address:{
        type: DataTypes.STRING(500),
        allowNull: false
    },
    avatar:{
        type: DataTypes.BLOB('medium')
    },
    tel:{
        type: DataTypes.STRING(10),
        allowNull: false
    },
    gender:{
        type: DataTypes.STRING(1)
    }
})

const PatientToken = sequelize.define('patient_token',{
    token:{
        type: DataTypes.STRING(200),
        allowNull:false
    },
    patient_id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references:{
            model: Patient,
            key: 'patient_id'
        }
    }
})

Patient.verifyLogin = async function(email,password){
    const patientResult = await Patient.findOne({where:{email},attributes:{
        exclude:['avatar']
    }});
    if(!patientResult){
        throw new Error('ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบชื่อผู้ใช้และรหัสผ่านอีกครั้ง');
    }
    
    const isMatch = await bcrypt.compare(password,patientResult.password);
    if(!isMatch){
        throw new Error('ไม่สามารถเข้าสู่ระบบได้ โปรดตรวจสอบชื่อผู้ใช้และรหัสผ่านอีกครั้ง');
    }

    return patientResult;
}

PatientToken.removeAttribute('id')

Patient.beforeCreate(async (patient,options)=>{
    patient.email = patient.email.toLowerCase();
    const encryptPassword = await bcrypt.hash(patient.password,8);
    patient.password = encryptPassword;
})
module.exports = {Patient,PatientToken}