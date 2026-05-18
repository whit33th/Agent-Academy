import { defineType, defineField } from "sanity";

export default defineType({
  name: "agent",
  title: "Agent",
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
      name: "role",
      title: "Role",
      type: "string",
      options: {
        list: [
          { title: "Duelist", value: "duelist" },
          { title: "Controller", value: "controller" },
          { title: "Sentinel", value: "sentinel" },
          { title: "Initiator", value: "initiator" },
        ],
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "image",
      title: "Agent Image",
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
