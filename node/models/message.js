function make(Schema, mongoose) {
    MessageSchema = new Schema();
    MessageSchema.add({
        episode_id: Schema.Types.ObjectId,
        section_id: Schema.Types.ObjectId,
        item_slug: String,
        slug: String,
        full_slug: String,
        parent_slug: String,
        level: { type: Number, default: 0 },
        posted: Date,
        username: String,
        user_slug: String,
        message: String,
        promotion: Schema.Types.Mixed,
        readonly: { type: Boolean, default: false },
        message_type: {type: String, default: 'chat'}
    });
    return mongoose.model('Message', MessageSchema);
}
module.exports.make = make;