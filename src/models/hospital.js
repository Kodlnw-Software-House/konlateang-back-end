const { DataTypes } = require('sequelize')
const bcrypt = require('bcryptjs')
const sequelize = require('../db/sequelize')

const Hostipal = sequelize.define('hospital_adminstator',{
    hospital_id:{
        type: DataTypes.INTEGER,
        primaryKey:true,
        allowNull: false,
        autoIncrement: true
    },
    hospital_name:{
        type: DataTypes.STRING(45),
        allowNull: false,
        unique: 'hospital_name_UNIQUE',
        validate:{
            isUnique: async function(value){
                const hospital = await Hostipal.findOne({where:{hospital_name:value}})
                if(hospital){
                    throw new Error('hospital_name already in use!')
                }
            }
        }
    },
    email:{
        type: DataTypes.STRING(45),
        allowNull: false,
        validate:{
            isEmail:true
        }
    },
    password:{
        type: DataTypes.STRING(100),
        allowNull: false
    }
})

const HospitalToken = sequelize.define('hospital_adminstator_token',{
    token:{
        type: DataTypes.STRING(200),
        allowNull: false,
        unique: 'token_UNIQUE'
    },
    hospital_id:{
        type: DataTypes.INTEGER,
        allowNull: false,
        references: Hostipal,
        key:'hospital_id'
    }
})

HospitalToken.removeAttribute('id')

Hostipal.verifyLogin = async function(email,password){
    const hospitalResult = await Hostipal.findOne({where:{email}});
    if(!hospitalResult){
        throw new Error('unable to login.');
    }

    const isMatch = await bcrypt.compare(password,hospitalResult.password);
    if(!isMatch){
        throw new Error('unable to login.');
    }

    return hospitalResult;
}

module.exports = {Hostipal,HospitalToken}