function make(Schema, mongoose) {
    ItemSchema = new Schema({
            episode_id: Schema.Types.ObjectId,
            section_id: Schema.Types.ObjectId,
            slug: String,
            stage: String,
            username: String,
            user_slug: String,
            title: String,
            body: String,
            group: Schema.Types.Mixed,
            annotate: String,
            comment: String,
            order: { type: Number, default: 0},
            created: Date,
            updated: Date,
            archived: Date,
            fixed: { type: Boolean, default: false },
            readonly: { type: Boolean, default: false },
            deleted: { type: Boolean, default: false },
            links: [{
                title: String,
                url: String
            }],
            labels: Schema.Types.Mixed,
            pos: {
                x: { type: Number, default: 0 },
                y: { type: Number, default: 0 },
                z: { type: Number, default: 0 }
            },
            archive: { type: Boolean, default: false },
            promotion: Schema.Types.Mixed
        });
    return mongoose.model('Item', ItemSchema);
}
module.exports.make = make;