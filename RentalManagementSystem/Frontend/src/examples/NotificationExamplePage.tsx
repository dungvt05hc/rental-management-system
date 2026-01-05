import { useState } from 'react';
import { Alert } from '../components/ui/Alert';
import { useNotification } from '../contexts/NotificationContext';
import { Button } from '../components/ui/Button';

/**
 * Example page demonstrating how to use the Alert and Notification system
 * This file can be used as a reference for implementing alerts in your application
 */
export function NotificationExamplePage() {
  const notification = useNotification();
  const [showAlert, setShowAlert] = useState(true);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Alert & Notification System</h1>
        <p className="text-gray-600">
          Examples of how to use alerts and notifications in your application
        </p>
      </div>

      {/* Static Alerts Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Static Alerts</h2>
        <p className="text-sm text-gray-600 mb-4">
          Use these for inline messages that persist on the page
        </p>

        <Alert variant="success" title="Success!">
          Your changes have been saved successfully.
        </Alert>

        <Alert variant="error" title="Error">
          Something went wrong. Please try again later.
        </Alert>

        <Alert variant="warning" title="Warning">
          This action cannot be undone. Please proceed with caution.
        </Alert>

        <Alert variant="info" title="Information">
          Your subscription will expire in 7 days. Please renew to continue using the service.
        </Alert>

        {/* Dismissible Alert */}
        {showAlert && (
          <Alert
            variant="info"
            title="Dismissible Alert"
            onClose={() => setShowAlert(false)}
          >
            This alert can be dismissed by clicking the X button.
          </Alert>
        )}

        {!showAlert && (
          <Button onClick={() => setShowAlert(true)} variant="outline">
            Show Dismissible Alert
          </Button>
        )}
      </div>

      {/* Toast Notifications Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Toast Notifications</h2>
        <p className="text-sm text-gray-600 mb-4">
          Use these for temporary messages that auto-dismiss (shown in top-right corner)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => notification.success('Operation completed successfully!')}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            Show Success Toast
          </Button>

          <Button
            onClick={() => notification.error('An error occurred. Please try again.')}
            variant="default"
            className="bg-red-600 hover:bg-red-700"
          >
            Show Error Toast
          </Button>

          <Button
            onClick={() => notification.warning('Please review your changes before proceeding.')}
            variant="default"
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Show Warning Toast
          </Button>

          <Button
            onClick={() => notification.info('New updates are available.')}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700"
          >
            Show Info Toast
          </Button>
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Advanced Options</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => 
                notification.success(
                  'Your invoice has been created successfully.',
                  'Invoice Created',
                  3000
                )
              }
              variant="outline"
            >
              With Title (3s)
            </Button>

            <Button
              onClick={() => 
                notification.info(
                  'This notification will stay for 10 seconds.',
                  'Long Duration',
                  10000
                )
              }
              variant="outline"
            >
              Long Duration (10s)
            </Button>

            <Button
              onClick={() => {
                notification.success('First notification');
                setTimeout(() => notification.info('Second notification'), 500);
                setTimeout(() => notification.warning('Third notification'), 1000);
              }}
              variant="outline"
            >
              Multiple Notifications
            </Button>

            <Button
              onClick={() => 
                notification.error(
                  'This is a very long error message that demonstrates how the notification component handles longer text content. It should wrap properly and remain readable.',
                  'Long Message Example'
                )
              }
              variant="outline"
            >
              Long Message
            </Button>
          </div>
        </div>
      </div>

      {/* Usage Examples */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Usage Examples</h2>
        
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Using Static Alerts</h3>
            <pre className="bg-white p-4 rounded border text-sm overflow-x-auto">
{`import { Alert } from './components/ui/Alert';

<Alert variant="success" title="Success!">
  Your changes have been saved.
</Alert>`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Using Toast Notifications</h3>
            <pre className="bg-white p-4 rounded border text-sm overflow-x-auto">
{`import { useNotification } from './contexts/NotificationContext';

function MyComponent() {
  const notification = useNotification();
  
  const handleSave = async () => {
    try {
      await saveData();
      notification.success('Data saved successfully!');
    } catch (error) {
      notification.error('Failed to save data');
    }
  };
}`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Advanced Notification Options</h3>
            <pre className="bg-white p-4 rounded border text-sm overflow-x-auto">
{`// With title and custom duration
notification.success(
  'Your invoice has been created',
  'Invoice Created',
  7000 // 7 seconds
);

// Or use the generic method
notification.showNotification({
  type: 'warning',
  title: 'Custom Title',
  message: 'Custom message',
  duration: 5000
});`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
