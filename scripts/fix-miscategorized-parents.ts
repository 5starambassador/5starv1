import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function fixMiscategorizedParents() {
    console.log('--- STARTING DATA FIX ---');
    
    // IDs for the 151 users identified in eligible_parents_fix.csv
    const userIds = [
        5809, 5939, 6082, 11319, 5888, 5277, 12106, 8267, 5936, 4102, 
        11323, 11324, 10283, 12110, 10938, 5963, 5153, 6784, 8035, 5188, 
        5290, 6504, 8628, 12187, 12199, 8333, 7847, 4789, 12121, 8198, 
        8582, 10681, 8229, 9029, 6927, 12200, 7990, 7046, 8976, 8163, 
        9026, 9550, 8972, 7348, 7349, 6371, 6512, 7375, 6591, 7691, 
        9011, 12308, 12306, 10755, 3922, 6648, 7539, 6862, 7249, 3249, 
        6662, 12953, 8754, 8788, 11259, 11728, 4073, 3800, 8924, 3322, 
        6042, 1949, 3529, 4345, 3792, 9408, 9390, 9456, 9557, 4951, 
        4412, 4608, 8637, 8624, 8996, 4626, 8919, 10891, 5304, 10419, 
        10846, 4609, 4226, 5833, 6350, 4548, 4654, 4443, 8652, 4436, 
        12114, 4970, 8107, 4631, 10986, 7785, 4857, 7363, 5022, 4486, 
        6251, 5695, 6079, 5631, 5024, 6094, 3384, 5094, 11720, 2547, 
        3945, 3593, 12103, 9479, 5177, 4514, 4405, 3803, 4234, 4250, 
        4421, 4973, 4818, 5023, 8567, 9632, 8818, 5742, 5854, 5911, 
        4891, 5897, 5931, 4339, 4964, 3997, 3879, 6120, 5735, 4045, 6096
    ];

    console.log(`Ready to update ${userIds.length} users...`);

    const result = await prisma.user.updateMany({
        where: { userId: { in: userIds } },
        data: { childInAchariya: true }
    });

    console.log(`Successfully updated ${result.count} users.`);
    await prisma.$disconnect();
}

fixMiscategorizedParents().catch(console.error);
