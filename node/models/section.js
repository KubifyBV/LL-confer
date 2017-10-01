function make(Schema, mongoose) {
    SectionSchema = new Schema({
        episode_id: Schema.Types.ObjectId,
        slug: String,
        title: String,
        description: String,
        order: { type: Number, default: 0},
        stage: String,
        phase: String,
        created: Date,
        settings: Schema.Types.Mixed
    });
    return mongoose.model('Section', SectionSchema);
}
module.exports.make = make;