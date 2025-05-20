"use client";
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CalendarDays, Settings, Presentation, Film } from 'lucide-react';
import Link from 'next/link';
export default function DashboardContent() {
    var _a;
    const { loading, user } = useGlobal();
    const getDaysSinceRegistration = () => {
        if (!(user === null || user === void 0 ? void 0 : user.registered_at))
            return 0;
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - user.registered_at.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };
    if (loading) {
        return (<div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>);
    }
    const daysSinceRegistration = getDaysSinceRegistration();
    return (<div className="space-y-6 p-6">
            <Card>
                <CardHeader>
                    <CardTitle>Welcome, {(_a = user === null || user === void 0 ? void 0 : user.email) === null || _a === void 0 ? void 0 : _a.split('@')[0]}! 👋</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4"/>
                        Member for {daysSinceRegistration} days
                    </CardDescription>
                </CardHeader>
            </Card>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Link href="/app/powerbrief" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-primary-50 rounded-full">
                                <Presentation className="h-4 w-4 text-primary-600"/>
                            </div>
                            <div>
                                <h3 className="font-medium">PowerBrief</h3>
                                <p className="text-sm text-gray-500">Manage your brief concepts</p>
                            </div>
                        </Link>

                        <Link href="/app/reviews" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-primary-50 rounded-full">
                                <Film className="h-4 w-4 text-primary-600"/>
                            </div>
                            <div>
                                <h3 className="font-medium">Ad Reviews</h3>
                                <p className="text-sm text-gray-500">Review ad content</p>
                            </div>
                        </Link>
                        
                        <Link href="/app/user-settings" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="p-2 bg-primary-50 rounded-full">
                                <Settings className="h-4 w-4 text-primary-600"/>
                            </div>
                            <div>
                                <h3 className="font-medium">User Settings</h3>
                                <p className="text-sm text-gray-500">Manage your account preferences</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>);
}
