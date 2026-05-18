import { defineType, defineField } from "sanity";

export default defineType({
  name: "mapAgentMeta",
  title: "Map Agent Meta",
  type: "document",
  fields: [
    defineField({
      name: "map",
      title: "Map",
      type: "reference",
      to: [{ type: "map" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "agent",
      title: "Agent",
      type: "reference",
      to: [{ type: "agent" }],
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "viability",
      title: "Viability",
      type: "string",
      options: {
        list: [
          { title: "S - Must Pick", value: "S" },
          { title: "A - Great", value: "A" },
          { title: "B - Good", value: "B" },
          { title: "C - Situational", value: "C" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "notes",
      title: "Notes",
      type: "text",
      rows: 2,
    }),
  ],
});
