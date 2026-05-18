import { defineType, defineField } from "sanity";

export default defineType({
  name: "screenshot",
  title: "Screenshot",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (Rule) => Rule.required(),
    }),
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
      name: "abilityType",
      title: "Ability Type",
      type: "string",
      options: {
        list: [
          { title: "Smoke", value: "smoke" },
          { title: "Wall", value: "wall" },
          { title: "Flash", value: "flash" },
          { title: "Molly", value: "molly" },
          { title: "Recon", value: "recon" },
          { title: "Heal", value: "heal" },
          { title: "Ultimate", value: "ultimate" },
          { title: "Other", value: "other" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "description",
      title: "Description / Notes",
      type: "text",
      rows: 3,
    }),
  ],
});
