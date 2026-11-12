using System.Text.RegularExpressions;

namespace FundiGrid.Api.Services;

/// <summary>One rule set for every password the product accepts.</summary>
public static partial class PasswordPolicy
{
    public const int MinLength = 8;

    public const string Message =
        "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number and a symbol.";

    public static (bool Ok, string Message, string[] Failed) Validate(string? password)
    {
        var pw = password ?? "";
        var failed = new List<string>();
        if (pw.Length < MinLength) failed.Add("length");
        if (!UpperRegex().IsMatch(pw)) failed.Add("upper");
        if (!LowerRegex().IsMatch(pw)) failed.Add("lower");
        if (!DigitRegex().IsMatch(pw)) failed.Add("digit");
        if (!SymbolRegex().IsMatch(pw)) failed.Add("symbol");
        return (failed.Count == 0, Message, failed.ToArray());
    }

    /// <summary>Flags passwords chosen before the current rules.</summary>
    public static bool IsWeak(string? password)
    {
        if (string.IsNullOrEmpty(password)) return false;
        return !Validate(password).Ok;
    }

    [GeneratedRegex("[A-Z]")]
    private static partial Regex UpperRegex();

    [GeneratedRegex("[a-z]")]
    private static partial Regex LowerRegex();

    [GeneratedRegex("\\d")]
    private static partial Regex DigitRegex();

    [GeneratedRegex("[^A-Za-z0-9]")]
    private static partial Regex SymbolRegex();
}
