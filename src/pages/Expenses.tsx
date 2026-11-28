import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, DollarSign, Wallet, FileText, Loader2, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/AppSettingsContext";
import { formatAndConvert } from "@/utils/currency";
import { toast } from "@/hooks/use-toast";
import { useExpenses, useCreateExpense, useDeleteExpense } from "@/hooks/useExpenses";

export default function Expenses() {
    const { hotelId, user, role } = useAuth();
    const { currency } = useCurrency();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        amount: "",
        category: "maintenance",
        description: "",
        date: new Date().toISOString().split('T')[0],
    });

    const { data: expenses = [], isLoading, isError } = useExpenses();
    const createExpense = useCreateExpense();
    const deleteExpense = useDeleteExpense();

    // All hooks must run before any early return (rules of hooks).
    if (role !== 'owner' && role !== 'super_admin') {
        return <Navigate to="/" replace />;
    }

    const handleCreateExpense = async () => {
        await createExpense.mutateAsync({
            amount: parseFloat(formData.amount),
            category: formData.category,
            description: formData.description,
            date: formData.date
        });
        setIsDialogOpen(false);
        setFormData({
            amount: "",
            category: "maintenance",
            description: "",
            date: new Date().toISOString().split('T')[0],
        });
    };

    const filteredExpenses = expenses.filter(e =>
        (e.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.category || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    if (isLoading) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
                        <p className="text-muted-foreground">
                            Track and manage your hotel's operational costs
                        </p>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2">
                                <Plus className="h-4 w-4" />
                                Record Expense
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Record New Expense</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label>Amount ({currency}) *</Label>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Category *</Label>
                                    <Select
                                        value={formData.category}
                                        onValueChange={(v) => setFormData({ ...formData, category: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="utilities">Utilities</SelectItem>
                                            <SelectItem value="salaries">Salaries</SelectItem>
                                            <SelectItem value="marketing">Marketing</SelectItem>
                                            <SelectItem value="supplies">Supplies</SelectItem>
                                            <SelectItem value="other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Input
                                        placeholder="Repairing AC in room 101"
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <Button
                                    className="w-full mt-2"
                                    onClick={handleCreateExpense}
                                    disabled={!formData.amount || createExpense.isPending}
                                >
                                    {createExpense.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Expense"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatAndConvert(totalExpenses, currency)}</div>
                            <p className="text-xs text-muted-foreground">Across all categories</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Monthly Burn</CardTitle>
                            <Wallet className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatAndConvert(expenses
                                    .filter(e => new Date(e.date).getMonth() === new Date().getMonth())
                                    .reduce((sum, e) => sum + Number(e.amount), 0), currency)}
                            </div>
                            <p className="text-xs text-muted-foreground">Current month</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Expense Count</CardTitle>
                            <FileText className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{expenses.length}</div>
                            <p className="text-xs text-muted-foreground">Records found</p>
                        </CardContent>
                    </Card>
                </div>

                <div className="glass-card p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by description or category..."
                            className="pl-10 bg-muted/50 border-0"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredExpenses.map((expense) => (
                                <TableRow key={expense.id}>
                                    <TableCell>{expense.date}</TableCell>
                                    <TableCell className="capitalize">{expense.category}</TableCell>
                                    <TableCell>{expense.description || "-"}</TableCell>
                                    <TableCell className="text-right font-medium text-destructive">
                                        -{formatAndConvert(expense.amount, currency)}
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            onClick={() => {
                                                if (confirm("Delete this expense?")) {
                                                    deleteExpense.mutate(expense.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {isError && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        Expenses are managed by the hotel owner.
                                    </TableCell>
                                </TableRow>
                            )}
                            {!isError && filteredExpenses.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No expenses found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </AppLayout>
    );
}
