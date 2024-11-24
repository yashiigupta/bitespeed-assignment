import { Request, Response } from 'express';
import { findByEmailOrPhone } from '../models/Contact';
import { createUser } from '../models/Contact';
import { updateUser } from '../models/Contact';
import { getAllLinkedUsers } from '../models/Contact';

class IdentityHandler {
  async identify(req: Request, res: Response) {
    try {
      const { email, phoneNumber } = req.body;

      // Validate input
      if (!email && !phoneNumber) {
        return res.status(400).json({ error: 'Email or phone number is required' });
      }

      // Find existing users including all linked ones
      const existingUsers: any = await findByEmailOrPhone(email, phoneNumber);

      if (existingUsers.length === 0) {
        // Create new primary user
        const newUser = await createUser({
          email,
          phoneNumber,
          linkedId: null,
          linkPrecedence: 'primary'
        });

        // Return response with single user
        return res.json({
          contact: {
            primaryContactId: newUser.id,
            emails: email ? [email] : [],
            phoneNumbers: phoneNumber ? [phoneNumber] : [],
            secondaryContactIds: []
          }
        });
      }

      // Sort users by creation date to find the oldest one
      const sortedUsers = [...existingUsers].sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const oldestUser = sortedUsers[0];
      const primaryUser = oldestUser;

      // Convert any other primary users to secondary and link them to the oldest user
      const primaryUsers = sortedUsers.filter(u => u.linkPrecedence === 'primary' && u.id !== primaryUser.id);
      
      for (const user of primaryUsers) {
        await updateUser(user.id, {
          linkPrecedence: 'secondary',
          linkedId: primaryUser.id
        });
      }

      // Check if we need to create a new secondary user
      // Only create if the exact combination doesn't exist AND we're not just linking existing users
      const needsNewUser = email && 
                            phoneNumber && 
                            !existingUsers.some((user: any)=> user.email === email && user.phoneNumber === phoneNumber) &&
                            !primaryUsers.length; // Don't create new user if we're just linking existing ones

      if (needsNewUser) {
        await createUser({
          email,
          phoneNumber,
          linkedId: primaryUser.id,
          linkPrecedence: 'secondary'
        });
      }

      // Get all linked users including the new one if created
      const allLinkedUsers: any = await getAllLinkedUsers(primaryUser.id);

      // Prepare response
      const response:any = {
        contact: {
          primaryContactId: primaryUser.id,
          emails: [...new Set(allLinkedUsers.map((u: any) => u.email).filter(Boolean) as string[])],
          phoneNumbers: [...new Set(allLinkedUsers.map((u: any) => u.phoneNumber).filter(Boolean) as string[])],
          secondaryContactIds: allLinkedUsers
            .filter((u: any) => u.linkPrecedence === 'secondary')
            .map((u: any) => u.id)
        }
      };

      res.json(response);
    } catch (error) {
      console.error('Error in identify:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new IdentityHandler();