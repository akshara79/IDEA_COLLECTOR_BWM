const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  const admin = await prisma.user.upsert({
    where: { email: "admin@campus.edu" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@campus.edu",
      role: "admin"
    }
  });

  const campaign = await prisma.campaign.upsert({
    where: { title: "Sustainability Ideas — Demo" },
    update: {},
    create: {
      title: "Sustainability Ideas — Demo",
      description: "Collecting student ideas for campus sustainability projects.",
      createdById: admin.id
    }
  });

  const ideas = [
    {
      title: "Solar charging stations",
      description: "Install solar-powered phone/laptop charging benches near the quad and library."
    },
    {
      title: "Composting program for dorms",
      description: "Weekly compost pickups from dorms with central composting for campus gardens."
    },
    {
      title: "Bike share",
      description: "Small bike fleet with docking to promote active transit."
    }
  ];

  for (const idea of ideas) {
    await prisma.idea.upsert({
      where: { title: idea.title },
      update: {},
      create: {
        campaignId: campaign.id,
        title: idea.title,
        description: idea.description
      }
    });
  }

  console.log("Seed finished.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });