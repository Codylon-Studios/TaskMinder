import { Ajv, ErrorObject } from "ajv";
const ajv = new Ajv({ allErrors: true });

const schema = {
  type: "array",
  items: {
    type: "array",
    items: {
      type: "object",
      required: ["lessonType", "start", "end"],
      properties: {
        lessonType: {
          type: "string",
          enum: ["normal", "teamed", "rotating", "break"]
        },
        start: { type: "string", pattern: "^[0-2]?\\d:[0-5]\\d$" },
        end: { type: "string", pattern: "^[0-2]?\\d:[0-5]\\d$" },

        subjectId: { type: "integer" },
        room: { type: "string" },

        teams: {
          type: "array",
          items: {
            type: "object",
            required: ["teamId", "subjectId", "room"],
            properties: {
              teamId: { type: "integer" },
              subjectId: { type: "integer" },
              room: { type: "string" }
            }
          }
        },

        variants: {
          type: "array",
          items: {
            type: "object",
            required: ["subjectId", "room"],
            properties: {
              subjectId: { type: "integer" },
              room: { type: "string" }
            }
          }
        }
      },
      allOf: [
        {
          if: { properties: { lessonType: { const: "normal" } } },
          then: { required: ["subjectId", "room"] }
        },
        {
          if: { properties: { lessonType: { const: "teamed" } } },
          then: { required: ["teams"] }
        },
        {
          if: { properties: { lessonType: { const: "rotating" } } },
          then: { required: ["variants"] }
        },
        {
          if: { properties: { lessonType: { const: "break" } } },
          then: { required: ["subjectId", "room"] }
        }
      ]
    }
  }
};

const validate = ajv.compile(schema);

export const validateTimetableJSON = (data: unknown): {
  valid: boolean;
  errors: ErrorObject<string, Record<string, unknown>, unknown>[] | null | undefined;
} => {
  const valid = validate(data);
  return {
    valid,
    errors: validate.errors
  };
};

export default validateTimetableJSON;
