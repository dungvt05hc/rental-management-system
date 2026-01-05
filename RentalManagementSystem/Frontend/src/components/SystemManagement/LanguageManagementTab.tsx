import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Alert,
} from '@mui/material';

const LanguageManagementTab: React.FC = () => {
  return (
    <Box>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Language Management
        </Typography>
        <Alert severity="info">
          Language management is already available through the Localization Controller.
          <br />
          Use the <strong>/api/Localization</strong> endpoints to manage languages and translations.
        </Alert>
        <Box mt={3}>
          <Typography variant="body2" color="text.secondary">
            Available operations:
          </Typography>
          <ul>
            <li>GET /api/Localization/languages - Get all languages</li>
            <li>GET /api/Localization/languages/{'<code>'} - Get language by code</li>
            <li>POST /api/Localization/languages - Create new language (Admin)</li>
            <li>GET /api/Localization/translations/{'<languageCode>'} - Get translations</li>
            <li>PUT /api/Localization/translations/{'<languageCode>'} - Update translation</li>
            <li>POST /api/Localization/seed - Seed default translations (Admin)</li>
          </ul>
        </Box>
      </Paper>
    </Box>
  );
};

export default LanguageManagementTab;
