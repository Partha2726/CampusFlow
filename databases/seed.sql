-- Extracted from seed.pdf (syntax normalized for executable SQL)

SET FOREIGN_KEY_CHECKS = 0;

-- 1.) STUDENT
INSERT INTO STUDENT VALUES
(1, '24BDS1044', 'Partha Kumar', 'partha@example.com', 'CSE', 2, '9999999999'),
(2, '24BDS1045', 'Asha Rao', 'asha@example.com', 'ECE', 2, '8888888888'),
(3, '24BDS1046', 'Rahul Sharma', 'rahul@example.com', 'CSE', 2, '7777777777'),
(4, '24BDS1047', 'Neha Iyer', 'neha@example.com', 'IT', 3, '6666666666'),
(5, '24BDS1048', 'Arjun Patel', 'arjun@example.com', 'MECH', 2, '5555555555'),
(6, '24BDS1049', 'Sneha Nair', 'sneha@example.com', 'ECE', 3, '4444444444');

-- 2.) CLUB
INSERT INTO CLUB VALUES
(1, 'Tech Titans', 'Technical', 'Coding and hardware projects', 'Dr. Ramesh', CURDATE()),
(2, 'Dance Crew', 'Cultural', 'Contemporary and classical dance', 'Prof. Meera', CURDATE()),
(3, 'Robotics Club', 'Technical', 'Robotics and AI projects', 'Dr. Kiran', CURDATE()),
(4, 'Music Society', 'Cultural', 'Band and singing events', 'Prof. Arjun', CURDATE());

-- 3.) VENUE (as written in seed.pdf)
INSERT IGNORE INTO EVENT VALUES
(1, 'Hackathon 2026', 'Technical', '24-hour coding challenge', '2026-03-20 09:00:00', '2026-03-21 09:00:00', 'team', 100, 0, 1, 1),
(2, 'Dance Night', 'Cultural', 'Inter-college dance competition', '2026-04-10 18:00:00', '2026-04-10 22:00:00', 'team', 8, 50, 2, 1);

-- 4.) EVENT
INSERT IGNORE INTO EVENT VALUES
(1, 'Hackathon 2026', 'Technical', '24-hour coding challenge', '2026-03-20 09:00:00', '2026-03-21 09:00:00', 'team', 100, 0, 1, 1),
(2, 'Dance Night', 'Cultural', 'Inter-college dance competition', '2026-04-10 18:00:00', '2026-04-10 22:00:00', 'team', 8, 50, 2, 1),
(3, 'Robotics Expo', 'Technical', 'Robotics showcase', '2026-05-01 10:00:00', '2026-05-01 17:00:00', 'team', 50, 100, 3, 1),
(4, 'Music Fest', 'Cultural', 'Live music performances', '2026-05-10 18:00:00', '2026-05-10 22:00:00', 'individual', 200, 30, 4, 1);

-- 5.) CLUB_MEMBERSHIP
INSERT INTO CLUB_MEMBERSHIP VALUES
(1, 1, 1, 'core_member', CURDATE() - INTERVAL 40 DAY, 'active'),
(2, 2, 2, 'member', CURDATE() - INTERVAL 60 DAY, 'active'),
(3, 3, 1, 'member', CURDATE(), 'active'),
(4, 4, 3, 'core_member', CURDATE(), 'active'),
(5, 5, 4, 'member', CURDATE(), 'active');

-- 6.) TEAM
INSERT INTO TEAM VALUES
(1, 'AlgoMasters', 1, 1, CURDATE()),
(2, 'CodeWarriors', 1, 3, CURDATE()),
(3, 'RoboKings', 3, 4, CURDATE());

-- 7.) TEAM_MEMBER
INSERT INTO TEAM_MEMBER VALUES
(1, 1, 1, 'leader', CURDATE()),
(2, 1, 2, 'member', CURDATE()),
(3, 2, 3, 'leader', CURDATE()),
(4, 2, 4, 'member', CURDATE()),
(5, 3, 4, 'leader', CURDATE()),
(6, 3, 5, 'member', CURDATE());

-- 8.) REGISTRATION
INSERT INTO REGISTRATION VALUES
(1, 1, 1, 1, CURDATE(), 'registered'),
(2, 2, NULL, 2, CURDATE(), 'registered'),
(3, 3, 2, 1, CURDATE(), 'registered'),
(4, 4, 2, 1, CURDATE(), 'registered'),
(5, 5, NULL, 4, CURDATE(), 'registered'),
(6, 6, NULL, 4, CURDATE(), 'registered'),
(7, 4, 3, 3, CURDATE(), 'registered');

-- 9.) PAYMENT
INSERT INTO PAYMENT VALUES
(1, 2, 50, 'card', 'completed', CURDATE()),
(2, 5, 30, 'upi', 'completed', CURDATE()),
(3, 6, 30, 'card', 'completed', CURDATE()),
(4, 7, 100, 'upi', 'pending', CURDATE());

-- 10.) FEEDBACK
INSERT INTO FEEDBACK VALUES
(1, 2, 2, 2, 5, 'Great production and organization', CURDATE());

-- 11.) SPONSOR
INSERT INTO SPONSOR VALUES
(1, 'Acme Corp', 'Rita Jain', 'rita@acmecorp.com', '7777777777', 'Gold'),
(2, 'TechNova', 'Amit Verma', 'amit@technova.com', '6666666666', 'Silver');

-- 12.) SPONSORSHIP
INSERT INTO SPONSORSHIP VALUES
(1, 1, NULL, 1, 50000, 'Branding and stall'),
(2, 2, NULL, 3, 30000, 'Banner and promotion');

SET FOREIGN_KEY_CHECKS = 1;
