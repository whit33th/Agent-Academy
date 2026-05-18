import { defineType, defineField } from "sanity";

export default defineType({
  name: "map",
  title: "Map",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Map Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "accentColor",
      title: "Accent Color",
      type: "string",
      description: "Hex color code, e.g. #FF4655",
    }),
  ],
});
