import mongoose, { Document, Schema, Types } from 'mongoose';
import { getSupportedLanguageIds, API_CONSTANTS } from '../utils/constants';
import { normalizeTags, isValidTagLength, isValidTagFormat } from '../utils/tagNormalization';

export interface ISnippet extends Document {
  userId: Types.ObjectId;
  title: string;
  description?: string;
  programmingLanguage: string;
  code: string;
  userName: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  starCount: number;
  commentCount: number;
  isOwnedBy(userId: string): boolean;
}

export interface ISnippetMethods {
  isOwnedBy(userId: string): boolean;
}

export type SnippetModel = mongoose.Model<ISnippet, {}, ISnippetMethods>;

const snippetSchema = new Schema<ISnippet, SnippetModel, ISnippetMethods>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    programmingLanguage: {
      type: String,
      required: true,
      validate: {
        validator: function(value: string) {
          return getSupportedLanguageIds().includes(value);
        },
        message: 'Invalid programming language. Must be one of the supported languages.',
      },
    },
    code: {
      type: String,
      required: true,
      maxlength: 50000,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function(tags: string[]) {
            const normalizedTags = normalizeTags(tags);
            return normalizedTags.length <= API_CONSTANTS.MAX_TAGS_PER_SNIPPET;
          },
          message: `Cannot have more than ${API_CONSTANTS.MAX_TAGS_PER_SNIPPET} unique tags per snippet`,
        },
        {
          validator: function(tags: string[]) {
            const normalizedTags = normalizeTags(tags);
            return normalizedTags.every(tag => 
              isValidTagLength(tag, API_CONSTANTS.MIN_TAG_LENGTH, API_CONSTANTS.MAX_TAG_LENGTH) && 
              isValidTagFormat(tag)
            );
          },
          message: `Each tag must be between ${API_CONSTANTS.MIN_TAG_LENGTH} and ${API_CONSTANTS.MAX_TAG_LENGTH} characters and have valid format`,
        },
      ],
      set: function(tags: string[]) {
        // Use the same normalization as validation
        return normalizeTags(tags);
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret: Record<string, any>) {
        const { __v, ...rest } = ret;
        // Ensure tags are included in JSON output
        if (rest.tags === undefined) {
          rest.tags = [];
        }
        return rest;
      },
    },
  }
);

// Indexes
snippetSchema.index({ userId: 1 });
// Index for contribution graph functionality and date-based queries
// Optimized for aggregation operations that group by date
snippetSchema.index({ createdAt: -1 });
snippetSchema.index({ title: 'text' });
snippetSchema.index({ programmingLanguage: 1 });
snippetSchema.index({ userId: 1, createdAt: -1 });
// Optimized tag indexes - compound indexes can serve single-field queries too
snippetSchema.index({ tags: 1, createdAt: -1 }); // Covers both tag filtering and tag+date sorting
snippetSchema.index({ programmingLanguage: 1, tags: 1, createdAt: -1 }); // Covers language+tag filtering

// Virtual fields
snippetSchema.virtual('starCount', {
  ref: 'Star',
  localField: '_id',
  foreignField: 'snippetId',
  count: true,
});

snippetSchema.virtual('commentCount', {
  ref: 'SnippetComment',
  localField: '_id',
  foreignField: 'snippetId',
  count: true,
});

// Instance methods
snippetSchema.methods.isOwnedBy = function(userId: string): boolean {
  return this.userId.toString() === userId;
};

export const Snippet = mongoose.model<ISnippet, SnippetModel>('Snippet', snippetSchema);