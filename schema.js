const Joi = require('joi');

module.exports.projectSchema = Joi.object({
    Project : Joi.object({
        name: Joi.string().required(),
        description: Joi.string().required(),
        location: Joi.string().required(),
        totalBudget: Joi.number().required().min(0),
        // startDate: Joi.date().required(),
        // endDate: Joi.date().required().greater('now'),
        image: Joi.string().allow("", null),
    }).required(),
});

module.exports.materialSchema = Joi.object({
    Material : Joi.object({
        name: Joi.string().required(),
        supplier: Joi.string().required(),
        price: Joi.number().required().min(0),
        stock: Joi.number().required().min(0),
    }).required(),
});