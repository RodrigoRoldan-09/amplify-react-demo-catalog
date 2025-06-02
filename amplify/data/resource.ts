import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/* This schema creates a Demo model to showcase your AWS projects with tags.
Each demo requires the following fields:
- projectName: The name of your project
- githubLink: Link to the project's GitHub repository  
- projectLink: Link to the deployed project
- imageUrl: URL for the project's screenshot or preview image
- tags: Many-to-many relationship with predefined tags
*/

const schema = a.schema({
  Demo: a
    .model({
      projectName: a.string(),
      githubLink: a.string(), 
      projectLink: a.string(),
      imageUrl: a.string(),
      tags: a.hasMany('DemoTag', 'demoId')
    })
    .authorization((allow) => [allow.publicApiKey()]),
    
  Tag: a
    .model({
      name: a.string().required(),
      color: a.string().required(), // Added color field for tag colors
      demos: a.hasMany('DemoTag', 'tagId')
    })
    .authorization((allow) => [allow.publicApiKey()]),
    
  DemoTag: a
    .model({
      demoId: a.id().required(),
      tagId: a.id().required(), 
      demo: a.belongsTo('Demo', 'demoId'),
      tag: a.belongsTo('Tag', 'tagId')
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/*
After deploying this schema, you'll need to manually add the 5 predefined tags to your database:
1. Games
2. ML  
3. Analytics
4. M&E
5. Generative AI

You can do this through the AWS Console or by creating a script to populate initial data.
*/

/*== STEP 2 ===============================================================
Go to your frontend source code. From your client-side code, generate a
Data client to make CRUDL requests to your table. (THIS SNIPPET WILL ONLY
WORK IN THE FRONTEND CODE FILE.)

Using JavaScript or Next.js React Server Components, Middleware, Server 
Actions or Pages Router? Review how to generate Data clients for those use
cases: https://docs.amplify.aws/gen2/build-a-backend/data/connect-to-API/
=========================================================================*/

/*
"use client"
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>() // use this Data client for CRUDL requests
*/

/*== STEP 3 ===============================================================
Fetch records from the database and use them in your frontend component.
(THIS SNIPPET WILL ONLY WORK IN THE FRONTEND CODE FILE.)
=========================================================================*/

/* For example, in a React component, you can use this snippet in your
  function's RETURN statement */
// const { data: todos } = await client.models.Todo.list()

// return <ul>{todos.map(todo => <li key={todo.id}>{todo.content}</li>)}</ul>
